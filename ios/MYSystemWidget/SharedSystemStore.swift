import Foundation

struct SharedQuest: Codable {
    let id: String
    let time: String
    let name: String
    let desc: String
    let xp: Int
}

struct SharedSystemState: Codable {
    var currentQuest: SharedQuest?
    var done: [String]
    var pendingComplete: String?
}

enum SharedSystemStore {
    static let suite = "group.com.mysystem.app"
    static let key = "my-system-widget-state"

    static func load() -> SharedSystemState {
        guard
            let data = UserDefaults(suiteName: suite)?.data(forKey: key),
            let state = try? JSONDecoder().decode(SharedSystemState.self, from: data)
        else {
            return SharedSystemState(currentQuest: nil, done: [], pendingComplete: nil)
        }
        return state
    }

    static func save(_ state: SharedSystemState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        UserDefaults(suiteName: suite)?.set(data, forKey: key)
    }

    static func requestCompletion(for taskID: String) {
        var state = load()
        if !state.done.contains(taskID) {
            state.done.append(taskID)
        }
        state.pendingComplete = taskID
        save(state)
    }
}
