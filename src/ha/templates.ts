import type { HomeAssistant } from "./types";

type Connection = NonNullable<HomeAssistant["connection"]>;

interface RenderTemplateMessage {
	result?: unknown;
	error?: string;
}

/**
 * Live Jinja templates through HA's `render_template` subscription (what Mushroom and the markdown card
 * use). HA re-renders whenever an entity the template reads changes. One subscription per key; `sync`
 * subscribes new or changed templates and drops the rest.
 */
export class TemplateSubscriptions {
	private readonly _active = new Map<
		string,
		{ template: string; unsubscribe: Promise<() => Promise<void>> }
	>();
	private _connection?: Connection;

	/** `label` names the card in console warnings. */
	constructor(
		private readonly _label: string,
		private readonly _onResult: (key: string, result: unknown) => void,
	) {}

	sync(
		connection: Connection | undefined,
		templates: Record<string, string | undefined>,
		variables: Record<string, unknown>,
	): void {
		if (connection !== this._connection) {
			this.clear();
			this._connection = connection;
		}
		if (!connection) return;
		for (const [key, current] of this._active) {
			if (templates[key] !== current.template) this._drop(key);
		}
		for (const [key, template] of Object.entries(templates)) {
			if (!template || this._active.has(key)) continue;
			const unsubscribe = connection.subscribeMessage<RenderTemplateMessage>(
				(message) => {
					if (message.error !== undefined)
						console.warn(`${this._label}: Vorlage "${key}": ${message.error}`);
					else this._onResult(key, message.result);
				},
				{ type: "render_template", template, variables, strict: false },
			);
			unsubscribe.catch((error: unknown) =>
				console.warn(`${this._label}: Vorlage "${key}" abgelehnt`, error),
			);
			this._active.set(key, { template, unsubscribe });
		}
	}

	clear(): void {
		for (const key of [...this._active.keys()]) this._drop(key);
		this._connection = undefined;
	}

	private _drop(key: string): void {
		const current = this._active.get(key);
		if (!current) return;
		this._active.delete(key);
		this._onResult(key, undefined);
		current.unsubscribe
			.then((unsubscribe) => unsubscribe())
			.catch(() => {
				// The subscription never started or the connection is gone; nothing left to stop.
			});
	}
}
