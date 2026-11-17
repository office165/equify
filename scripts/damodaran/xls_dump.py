"""
Minimal reader for legacy .xls (BIFF8 in an OLE2 container) and .xlsx, standard library only.
Prints every non-empty cell of every sheet as JSON: {"sheets": {name: [[row, col, value], ...]}}.
Used once to turn Damodaran's downloaded data files into lib/market-data/damodaran_2026.ts.
Usage: python3 -I scripts/damodaran/xls_dump.py <file.xls|file.xlsx>
"""
import json
import struct
import sys
import zipfile
import xml.etree.ElementTree as ET


def read_cfb_stream(data, wanted=("Workbook", "Book")):
    if data[:8] != bytes.fromhex("D0CF11E0A1B11AE1"):
        raise ValueError("not an OLE2 file")
    sector_shift = struct.unpack_from("<H", data, 30)[0]
    ssz = 1 << sector_shift
    num_fat = struct.unpack_from("<I", data, 44)[0]
    dir_start = struct.unpack_from("<I", data, 48)[0]
    difat_start = struct.unpack_from("<I", data, 68)[0]
    num_difat = struct.unpack_from("<I", data, 72)[0]

    def sector(n):
        off = 512 + n * ssz
        return data[off:off + ssz]

    difat = list(struct.unpack_from("<109I", data, 76))
    s = difat_start
    for _ in range(num_difat):
        if s >= 0xFFFFFFFA:
            break
        vals = struct.unpack("<%dI" % (ssz // 4), sector(s))
        difat.extend(vals[:-1])
        s = vals[-1]
    fat = []
    for fs in difat[:num_fat]:
        if fs >= 0xFFFFFFFA:
            continue
        fat.extend(struct.unpack("<%dI" % (ssz // 4), sector(fs)))

    def chain(start):
        out = bytearray()
        s = start
        seen = 0
        while s < 0xFFFFFFFA and seen < len(fat) + 1:
            out += sector(s)
            s = fat[s]
            seen += 1
        return bytes(out)

    dirdata = chain(dir_start)
    for i in range(0, len(dirdata), 128):
        e = dirdata[i:i + 128]
        name_len = struct.unpack_from("<H", e, 64)[0]
        name = e[:max(0, name_len - 2)].decode("utf-16-le", "ignore")
        if name in wanted:
            start = struct.unpack_from("<I", e, 116)[0]
            size = struct.unpack_from("<I", e, 120)[0]
            return chain(start)[:size]
    raise ValueError("no Workbook stream")


def decode_rk(rk):
    if rk & 2:
        v = rk >> 2
        if v & 0x20000000:
            v -= 0x40000000
        val = float(v)
    else:
        val = struct.unpack("<d", struct.pack("<Q", (rk & 0xFFFFFFFC) << 32))[0]
    return val / 100.0 if rk & 1 else val


def parse_biff(wb):
    records = []
    pos = 0
    while pos + 4 <= len(wb):
        rtype, rlen = struct.unpack_from("<HH", wb, pos)
        records.append((pos, rtype, wb[pos + 4:pos + 4 + rlen]))
        pos += 4 + rlen

    # SST with CONTINUE records.
    sst = []
    for idx, (_, rtype, rdata) in enumerate(records):
        if rtype != 0x00FC:
            continue
        chunks = [rdata]
        j = idx + 1
        while j < len(records) and records[j][1] == 0x003C:
            chunks.append(records[j][2])
            j += 1
        ci, off = 0, 8
        unique = struct.unpack_from("<I", rdata, 4)[0]

        def need(n):
            nonlocal ci, off
            if off + n > len(chunks[ci]) and off >= len(chunks[ci]):
                ci += 1
                off = 0

        for _ in range(unique):
            need(3)
            cnt = struct.unpack_from("<H", chunks[ci], off)[0]
            flags = chunks[ci][off + 2]
            off += 3
            rich = ext = 0
            if flags & 0x08:
                rich = struct.unpack_from("<H", chunks[ci], off)[0]
                off += 2
            if flags & 0x04:
                ext = struct.unpack_from("<I", chunks[ci], off)[0]
                off += 4
            wide = flags & 0x01
            chars = []
            remaining = cnt
            while remaining > 0:
                if off >= len(chunks[ci]):
                    ci += 1
                    off = 0
                    wide = chunks[ci][0] & 0x01
                    off = 1
                avail = (len(chunks[ci]) - off) // (2 if wide else 1)
                take = min(avail, remaining)
                if wide:
                    chars.append(chunks[ci][off:off + 2 * take].decode("utf-16-le", "ignore"))
                    off += 2 * take
                else:
                    chars.append(chunks[ci][off:off + take].decode("latin-1"))
                    off += take
                remaining -= take
            skip = rich * 4 + ext
            while skip > 0:
                if off >= len(chunks[ci]):
                    ci += 1
                    off = 0
                take = min(skip, len(chunks[ci]) - off)
                off += take
                skip -= take
            sst.append("".join(chars))
        break

    sheets = []
    for _, rtype, rdata in records:
        if rtype == 0x0085:
            bof = struct.unpack_from("<I", rdata, 0)[0]
            n = rdata[6]
            flags = rdata[7]
            name = rdata[8:8 + 2 * n].decode("utf-16-le") if flags & 1 else rdata[8:8 + n].decode("latin-1")
            sheets.append((name, bof))

    out = {}
    for name, bof in sheets:
        cells = []
        i = next(k for k, r in enumerate(records) if r[0] == bof)
        pending_formula = None
        for _, rtype, rdata in records[i + 1:]:
            if rtype == 0x000A:
                break
            if rtype == 0x00FD:
                r, c, _, k = struct.unpack_from("<HHHI", rdata, 0)
                cells.append([r, c, sst[k] if k < len(sst) else ""])
            elif rtype == 0x0203:
                r, c, _ = struct.unpack_from("<HHH", rdata, 0)
                cells.append([r, c, struct.unpack_from("<d", rdata, 6)[0]])
            elif rtype == 0x027E:
                r, c, _, rk = struct.unpack_from("<HHHI", rdata, 0)
                cells.append([r, c, decode_rk(rk)])
            elif rtype == 0x00BD:
                r, c0 = struct.unpack_from("<HH", rdata, 0)
                n = (len(rdata) - 6) // 6
                for k in range(n):
                    rk = struct.unpack_from("<I", rdata, 4 + 6 * k + 2)[0]
                    cells.append([r, c0 + k, decode_rk(rk)])
            elif rtype == 0x0006:
                r, c, _ = struct.unpack_from("<HHH", rdata, 0)
                res = rdata[6:14]
                if res[6:8] == b"\xff\xff":
                    if res[0] == 0:
                        pending_formula = (r, c)
                    elif res[0] == 1:
                        cells.append([r, c, bool(res[2])])
                else:
                    cells.append([r, c, struct.unpack("<d", res)[0]])
            elif rtype == 0x0207 and pending_formula:
                n = struct.unpack_from("<H", rdata, 0)[0]
                flags = rdata[2]
                s = rdata[3:3 + 2 * n].decode("utf-16-le", "ignore") if flags & 1 else rdata[3:3 + n].decode("latin-1")
                cells.append([pending_formula[0], pending_formula[1], s])
                pending_formula = None
            elif rtype == 0x0204:
                r, c, _, n = struct.unpack_from("<HHHH", rdata, 0)
                flags = rdata[8]
                s = rdata[9:9 + 2 * n].decode("utf-16-le", "ignore") if flags & 1 else rdata[9:9 + n].decode("latin-1")
                cells.append([r, c, s])
        out[name] = cells
    return out


def parse_xlsx(path):
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rel_ns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
    with zipfile.ZipFile(path) as z:
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", ns):
                shared.append("".join(t.text or "" for t in si.iter("{%s}t" % ns["m"])))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        target = {r.get("Id"): r.get("Target") for r in rels}
        out = {}
        for sh in wb.find("m:sheets", ns):
            t = target[sh.get(rel_ns)].lstrip("/")
            t = t if t.startswith("xl/") else "xl/" + t
            cells = []
            for c in ET.fromstring(z.read(t)).iter("{%s}c" % ns["m"]):
                ref = c.get("r")
                col_s = "".join(ch for ch in ref if ch.isalpha())
                row = int("".join(ch for ch in ref if ch.isdigit())) - 1
                col = 0
                for ch in col_s:
                    col = col * 26 + (ord(ch) - 64)
                v = c.find("m:v", ns)
                if v is None:
                    is_ = c.find("m:is", ns)
                    if is_ is not None:
                        cells.append([row, col - 1, "".join(x.text or "" for x in is_.iter("{%s}t" % ns["m"]))])
                    continue
                tp = c.get("t")
                if tp == "s":
                    val = shared[int(v.text)]
                elif tp in ("str", "inlineStr"):
                    val = v.text
                elif tp == "b":
                    val = v.text == "1"
                else:
                    try:
                        val = float(v.text)
                    except (TypeError, ValueError):
                        val = v.text
                cells.append([row, col - 1, val])
            out[sh.get("name")] = cells
        return out


def main():
    path = sys.argv[1]
    if path.endswith(".xlsx"):
        sheets = parse_xlsx(path)
    else:
        with open(path, "rb") as f:
            sheets = parse_biff(read_cfb_stream(f.read()))
    json.dump({"sheets": sheets}, sys.stdout)


if __name__ == "__main__":
    main()
