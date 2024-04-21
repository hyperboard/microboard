import { Subscription } from "App/getSubscriptions";
import { useEffect } from "react";
import { App } from "../App";

export function useAppSubscription(app: App, subscription: Subscription) {
	useEffect(() => {
		app.subscriptions.add(subscription);

		return () => {
			app.subscriptions.remove(subscription);
		};
	}, []);
}
