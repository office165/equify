// Round 4: extract one page of a PDF (macOS PDFKit). Usage: extract-page <in.pdf> <out.pdf> <page 1-based>
import Foundation
import PDFKit

let a = CommandLine.arguments
guard a.count == 4, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])), let n = Int(a[3]), let page = doc.page(at: n - 1) else {
  FileHandle.standardError.write("usage: extract-page <in.pdf> <out.pdf> <page>\n".data(using: .utf8)!)
  exit(1)
}
let out = PDFDocument()
out.insert(page, at: 0)
exit(out.write(to: URL(fileURLWithPath: a[2])) ? 0 : 1)
