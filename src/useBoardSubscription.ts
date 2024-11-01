import { Subscription } from "App/getSubscriptions";
import { useLayoutEffect } from "react";
import { App } from "../App";

export function useAppSubscription(app: App, subscription: Subscription): void {
	useLayoutEffect(() => {
		app.subscriptions.add(subscription);

		return () => {
			app.subscriptions.remove(subscription);
		};
	}, []);
}
