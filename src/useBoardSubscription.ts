import { Subscription } from "App/getSubscriptions";
import { useEffect, useLayoutEffect } from "react";
import { App } from "../App";

export function useAppSubscription(app: App, subscription: Subscription) {
	useLayoutEffect(() => {
		app.subscriptions.add(subscription);

		return () => {
			app.subscriptions.remove(subscription);
		};
	}, []);
}
