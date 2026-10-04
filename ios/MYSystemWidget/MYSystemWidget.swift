import WidgetKit
import SwiftUI
import AppIntents

struct WidgetQuest: TimelineEntry {
    let date: Date
    let quest: SharedQuest?
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetQuest {
        WidgetQuest(date: .now, quest: SharedSystemStore.load().currentQuest)
    }

    func getSnapshot(in context: Context, completion: @escaping (WidgetQuest) -> Void) {
        completion(WidgetQuest(date: .now, quest: SharedSystemStore.load().currentQuest))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetQuest>) -> Void) {
        let entry = WidgetQuest(date: .now, quest: SharedSystemStore.load().currentQuest)
        let next = Calendar.current.date(byAdding: .minute, value: 15, to: .now) ?? .now.addingTimeInterval(900)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct CompleteQuestIntent: AppIntent {
    static var title: LocalizedStringResource = "Valider la quête"

    @Parameter(title: "ID de la quête")
    var taskID: String

    init() {}
    init(taskID: String) { self.taskID = taskID }

    func perform() async throws -> some IntentResult {
        SharedSystemStore.requestCompletion(for: taskID)
        WidgetCenter.shared.reloadTimelines(ofKind: "MYSystemWidget")
        return .result()
    }
}

struct MYSystemWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: WidgetQuest

    var body: some View {
        if let q = entry.quest {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("MY SYSTEM")
                        .font(.caption2.weight(.black))
                        .tracking(1.2)
                    Spacer()
                    Text(q.time)
                        .font(.caption.weight(.bold))
                }
                Text(q.name)
                    .font(.headline.weight(.black))
                    .lineLimit(2)
                Text("+\(q.xp) XP")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
                Button(intent: CompleteQuestIntent(taskID: q.id)) {
                    Label("VALIDER", systemImage: "checkmark")
                }
                .buttonStyle(.borderedProminent)
                .font(.caption2.weight(.bold))
            }
            .padding(10)
        } else {
            VStack(alignment: .leading) {
                Text("MY SYSTEM").font(.caption2.weight(.black))
                Text("Aucune quête")
                    .font(.headline.weight(.bold))
            }
            .padding(10)
        }
    }
}

struct MYSystemWidget: Widget {
    let kind = "MYSystemWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MYSystemWidgetView(entry: entry)
        }
        .configurationDisplayName("Prochaine quête")
        .description("Affiche ta prochaine quête MY SYSTEM et permet de la valider.")
        .supportedFamilies([.accessoryRectangular, .systemSmall])
    }
}
