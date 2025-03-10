import React from "react";
import { useAppContext } from "features/AppContext";

const QuickAddButtonsClear: React.FC<{ children?: React.ReactNode }> = ({
	children,
}) => {
	const { app } = useAppContext();
	app.getBoard()?.selection.quickAddButtons.clear();
	return <>{children}</>;
};

export default QuickAddButtonsClear;
