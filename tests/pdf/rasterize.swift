// Renders every page of a PDF to PNG at a given DPI using PDFKit (macOS).
// Usage: swift tests/pdf/rasterize.swift <in.pdf> <outPrefix> <dpi>
// Prints the page count on stdout.
import Foundation
import PDFKit
import AppKit

let args = CommandLine.arguments
guard args.count >= 4, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])), let dpi = Double(args[3]) else {
  FileHandle.standardError.write("usage: rasterize <in.pdf> <outPrefix> <dpi>\n".data(using: .utf8)!)
  exit(2)
}
let scale = CGFloat(dpi / 72.0)
for i in 0..<doc.pageCount {
  guard let page = doc.page(at: i) else { continue }
  let box = page.bounds(for: .mediaBox)
  let w = Int((box.width * scale).rounded()), h = Int((box.height * scale).rounded())
  let cs = CGColorSpace(name: CGColorSpace.sRGB)!
  guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: cs,
                            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { exit(3) }
  ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
  ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
  ctx.scaleBy(x: scale, y: scale)
  ctx.translateBy(x: -box.origin.x, y: -box.origin.y)
  page.draw(with: .mediaBox, to: ctx)
  guard let img = ctx.makeImage() else { exit(4) }
  let rep = NSBitmapImageRep(cgImage: img)
  rep.size = NSSize(width: box.width, height: box.height)
  let data = rep.representation(using: .png, properties: [:])!
  try! data.write(to: URL(fileURLWithPath: String(format: "%@-p%d.png", args[2], i + 1)))
}
print(doc.pageCount)
