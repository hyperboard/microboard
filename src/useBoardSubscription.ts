import { Subscription } from "App/getSubscriptions";
import { useLayoutEffect } from "react";
import { useAppContext } from "View/AppContext";

export function useAppSubscription(subscription: Subscription): void {
	const { app } = useAppContext();
	useLayoutEffect(() => {
		app.subscriptions.add(subscription);

		return () => {
			app.subscriptions.remove(subscription);
		};
	}, []);
}
