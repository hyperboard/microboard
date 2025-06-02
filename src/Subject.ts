/**
 * Subject class to implement the observer pattern.
 * Observer is passed as a callback function.
 * Observers recive published object to read its properties
 * and call its methods to get its current state.
 * */
export class Subject<Type> {
	observers: ((object: Type) => void)[] = [];

	subscribe(observer: (object: Type) => void): void {
		const index = this.observers.indexOf(observer);
		if (index === -1) {
			this.observers.push(observer);
		}
	}

	unsubscribe(observer: (object: Type) => void): void {
		const index = this.observers.indexOf(observer);
		if (index !== -1) {
			this.observers.splice(index, 1);
		}
	}

	publish(object: Type): void {
		for (const observer of this.observers) {
			observer(object);
		}
	}
}
