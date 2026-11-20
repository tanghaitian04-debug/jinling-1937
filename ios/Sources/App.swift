import SwiftUI
import WebKit

@main
struct JinlingApp: App {
    var body: some Scene {
        WindowGroup { ContentView().ignoresSafeArea() }
    }
}

struct ContentView: View {
    var body: some View { WebView().ignoresSafeArea() }
}

struct WebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let cfg = WKWebViewConfiguration()
        cfg.allowsInlineMediaPlayback = true
        let web = WKWebView(frame: .zero, configuration: cfg)
        web.scrollView.bounces = false
        web.scrollView.contentInsetAdjustmentBehavior = .never
        web.backgroundColor = UIColor(red: 0.05, green: 0.04, blue: 0.03, alpha: 1)
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Game") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else if let url = Bundle.main.url(forResource: "index", withExtension: "html") {
            web.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return web
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
