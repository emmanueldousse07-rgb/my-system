import SwiftUI
import WebKit
import WidgetKit

@main
struct MYSystemApp: App {
    var body: some Scene {
        WindowGroup {
            WebContainer()
                .ignoresSafeArea()
        }
    }
}

struct WebContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "mySystemState")
        controller.add(context.coordinator, name: "mySystemReady")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.backgroundColor = .black
        if let url = URL(string: "https://emmanueldousse07-rgb.github.io/my-system/") {
            webView.load(URLRequest(url: url))
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKScriptMessageHandler {
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "mySystemReady" || message.name == "mySystemState" else { return }
            if message.name == "mySystemReady" {
                syncPendingCompletion(to: message.webView)
                return
            }
            guard
                let body = message.body as? [String: Any],
                let quest = body["currentQuest"] as? [String: Any],
                let id = quest["id"] as? String,
                let time = quest["time"] as? String,
                let name = quest["name"] as? String,
                let desc = quest["desc"] as? String,
                let xp = quest["xp"] as? Int,
                let done = body["done"] as? [String]
            else { return }

            let shared = SharedSystemState(
                currentQuest: SharedQuest(id: id, time: time, name: name, desc: desc, xp: xp),
                done: done,
                pendingComplete: SharedSystemStore.load().pendingComplete
            )
            SharedSystemStore.save(shared)
            WidgetCenter.shared.reloadTimelines(ofKind: "MYSystemWidget")
        }

        private func syncPendingCompletion(to webView: WKWebView?) {
            guard let webView else { return }
            let pending = SharedSystemStore.load().pendingComplete
            guard let taskID = pending else { return }
            let js = "window.__mySystemCompleteFromNative && window.__mySystemCompleteFromNative(\(String(reflecting: taskID)));"
            webView.evaluateJavaScript(js)
        }
    }
}
