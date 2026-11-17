import PlainClickCore
import SwiftUI

struct PanelView: View {
    @ObservedObject var model: PanelModel
    @ObservedObject var settings: AppSettings
    @ObservedObject var licence: LicenceManager
    let onPerform: (ActionDefinition) -> Void
    let onEnable: () -> Void
    let onOpenSettings: () -> Void

    private var comfortable: Bool { settings.comfortable }

    var body: some View {
        VStack(alignment: .leading, spacing: comfortable ? 12 : 6) {
            HStack(spacing: 6) {
                Text("Target:").foregroundStyle(.secondary)
                Text(model.targetName).fontWeight(.semibold).lineLimit(1)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Target app: \(model.targetName)")

            if model.paused {
                Text("PlainClick is paused. Resume it from the menu bar.")
                    .fixedSize(horizontal: false, vertical: true)
            } else if !licence.isPanelAllowed {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Your 7-day trial has ended. A licence is US$5.99, one time. The free appearance guide is still available in Settings.")
                        .font(.callout)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("Open Licence Settings…", action: onOpenSettings)
                }
            } else if !model.trusted {
                VStack(alignment: .leading, spacing: 8) {
                    Text("To press commands in other apps, PlainClick needs Accessibility access. It reads only those apps' menu commands, on this Mac. You can turn this off at any time in System Settings → Privacy & Security → Accessibility.")
                        .font(.callout)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("Turn on app control…", action: onEnable)
                }
            } else if !model.supported {
                Text("\(model.targetName) isn't supported yet. PlainClick only offers commands it has been tested with.")
                    .font(.callout)
                    .fixedSize(horizontal: false, vertical: true)
            } else if model.disabledByUser {
                Text("PlainClick is turned off for \(model.targetName). Turn it back on in Settings → Apps.")
                    .font(.callout)
                    .fixedSize(horizontal: false, vertical: true)
            } else if model.actions.isEmpty {
                Text("No actions pinned for \(model.targetName). Choose some in Settings → Apps.")
                    .font(.callout)
                    .fixedSize(horizontal: false, vertical: true)
            } else {
                ForEach(model.actions) { action in
                    Button { onPerform(action.def) } label: {
                        HStack(spacing: 8) {
                            if settings.showIcons {
                                Image(systemName: action.def.symbol).frame(width: 18).accessibilityHidden(true)
                            }
                            Text(action.def.label)
                            Spacer(minLength: 0)
                        }
                    }
                    .buttonStyle(PlainActionStyle(comfortable: comfortable))
                    .disabled(!action.availability.isRunnable)
                    .help(action.availability.explanation)
                    .accessibilityLabel(action.def.label)
                    .accessibilityHint(action.availability.explanation)
                }
            }

            if !model.status.isEmpty {
                Text(model.status)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if case .trial(let days) = licence.state {
                Text("Trial: \(days) day\(days == 1 ? "" : "s") left")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(comfortable ? 16 : 10)
        .frame(width: comfortable ? 260 : 220, alignment: .leading)
    }
}

/// Solid, bordered, high-legibility buttons. No translucency.
struct PlainActionStyle: ButtonStyle {
    let comfortable: Bool
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(comfortable ? .body : .callout)
            .padding(.vertical, comfortable ? 8 : 4)
            .padding(.horizontal, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 6)
                    .fill(configuration.isPressed ? Color.accentColor.opacity(0.25) : Color(nsColor: .controlBackgroundColor))
            )
            .overlay(RoundedRectangle(cornerRadius: 6).stroke(Color(nsColor: .separatorColor), lineWidth: 1))
            .foregroundStyle(isEnabled ? Color.primary : Color.secondary)
            .contentShape(Rectangle())
    }
}
