import AppKit
import AVFoundation
import CoreVideo
import Foundation

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let frameDirectory = root.appendingPathComponent("output/devpost/video-frames")
let outputURL = root.appendingPathComponent("output/devpost/clearpacket-demo.mp4")
let frameRate: Int32 = 30
let width = 1920
let height = 1080
let durations = [6, 12, 12, 12, 8]

try? FileManager.default.removeItem(at: outputURL)

let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
let input = AVAssetWriterInput(
    mediaType: .video,
    outputSettings: [
        AVVideoCodecKey: AVVideoCodecType.h264,
        AVVideoWidthKey: width,
        AVVideoHeightKey: height,
        AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: 5_000_000,
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        ],
    ]
)
input.expectsMediaDataInRealTime = false

let adaptor = AVAssetWriterInputPixelBufferAdaptor(
    assetWriterInput: input,
    sourcePixelBufferAttributes: [
        kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32ARGB,
        kCVPixelBufferWidthKey as String: width,
        kCVPixelBufferHeightKey as String: height,
    ]
)

guard writer.canAdd(input) else {
    fatalError("Unable to add the video input")
}
writer.add(input)
writer.startWriting()
writer.startSession(atSourceTime: .zero)

func loadCGImage(_ url: URL) -> CGImage {
    guard let image = NSImage(contentsOf: url),
          let cgImage = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        fatalError("Unable to load \(url.path)")
    }
    return cgImage
}

func makePixelBuffer(image: CGImage, progress: Double, animate: Bool) -> CVPixelBuffer {
    var buffer: CVPixelBuffer?
    let status = CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
    guard status == kCVReturnSuccess, let pixelBuffer = buffer else {
        fatalError("Unable to create a pixel buffer")
    }

    CVPixelBufferLockBaseAddress(pixelBuffer, [])
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, []) }

    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer),
          let context = CGContext(
              data: baseAddress,
              width: width,
              height: height,
              bitsPerComponent: 8,
              bytesPerRow: CVPixelBufferGetBytesPerRow(pixelBuffer),
              space: CGColorSpaceCreateDeviceRGB(),
              bitmapInfo: CGImageAlphaInfo.noneSkipFirst.rawValue
          ) else {
        fatalError("Unable to create a frame context")
    }

    context.setFillColor(NSColor.black.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))

    let zoom = animate ? 1.0 + (0.018 * progress) : 1.0
    let drawWidth = Double(width) * zoom
    let drawHeight = Double(height) * zoom
    let x = (Double(width) - drawWidth) / 2.0
    let y = (Double(height) - drawHeight) / 2.0
    context.draw(image, in: CGRect(x: x, y: y, width: drawWidth, height: drawHeight))
    return pixelBuffer
}

var frameIndex: Int64 = 0
for sceneIndex in 1...5 {
    let sceneURL = frameDirectory.appendingPathComponent("scene-\(sceneIndex).png")
    let image = loadCGImage(sceneURL)
    let sceneFrames = durations[sceneIndex - 1] * Int(frameRate)

    for sceneFrame in 0..<sceneFrames {
        while !input.isReadyForMoreMediaData {
            Thread.sleep(forTimeInterval: 0.002)
        }
        let progress = sceneFrames > 1 ? Double(sceneFrame) / Double(sceneFrames - 1) : 0.0
        let buffer = makePixelBuffer(image: image, progress: progress, animate: sceneIndex > 1 && sceneIndex < 5)
        let time = CMTime(value: frameIndex, timescale: frameRate)
        if !adaptor.append(buffer, withPresentationTime: time) {
            fatalError("Unable to append frame \(frameIndex): \(writer.error?.localizedDescription ?? "unknown error")")
        }
        frameIndex += 1
    }
}

input.markAsFinished()
let semaphore = DispatchSemaphore(value: 0)
writer.finishWriting {
    semaphore.signal()
}
semaphore.wait()

guard writer.status == .completed else {
    fatalError("Video encoding failed: \(writer.error?.localizedDescription ?? "unknown error")")
}

print(outputURL.path)
