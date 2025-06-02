/**
 * Subject class to implement the observer pattern.
 * Observer is passed as a callback function.
 * Observers recive published object to read its properties
 * and call its methods to get its current state.
 * Observers also recive operation that was performed on the subject.
 * */

export class SubjectOperation<Subject, Operation> {
	observers: ((subject: Subject, op: Operation) => void)[] = [];

	subscribe(observer: (subject: Subject, op: Operation) => void): void {
		const index = this.observers.indexOf(observer);
		if (index === -1) {
			this.observers.push(observer);
		}
	}

	unsubscribe(observer: (subject: Subject, op: Operation) => void): void {
		const index = this.observers.indexOf(observer);
		if (index !== -1) {
			this.observers.splice(index, 1);
		}
	}

	publish(subject: Subject, op: Operation): void {
		for (const observer of this.observers) {
			observer(subject, op);
		}
	}
}
