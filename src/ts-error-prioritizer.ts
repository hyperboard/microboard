import * as ts from "typescript";
import * as path from "path";

interface PrioritizedError {
  priority: "critical" | "high" | "medium" | "low";
  code: number;
  message: string;
  file: string;
  line: number;
  column: number;
}

function getPriorityByErrorCode(
  code: number
): "critical" | "high" | "medium" | "low" {
  // Критические ошибки, которые точно вызовут проблемы в рантайме
  const criticalErrors = [
    2307, // Cannot find module '...' or its corresponding type declarations
    2304, // Cannot find name '...'
    2552, // Cannot find name '...'. Did you mean '...'?
    1061, // ... is not accessible because its parent (if its a namespace member) is private
    1308, // 'await' expression is only allowed within an async function
  ];

  // Высокоприоритетные ошибки, которые очень вероятно вызовут проблемы
  const highPriorityErrors = [
    2339, // Property '...' does not exist on type '...'
    2345, // Argument of type '...' is not assignable to parameter of type '...'
    2322, // Type '...' is not assignable to type '...'
    2532, // Object is possibly 'undefined'
    2533, // Object is possibly 'null' or 'undefined'
  ];

  // Средний приоритет - могут вызвать проблемы при определенных условиях
  const mediumPriorityErrors = [
    2769, // No overload matches this call
    7034, // Variable '...' implicitly has type 'any' in some locations
    7006, // Parameter '...' implicitly has an 'any' type
    2740, // Type '...' is missing the following properties from type '...': ...
  ];

  if (criticalErrors.includes(code)) return "critical";
  if (highPriorityErrors.includes(code)) return "high";
  if (mediumPriorityErrors.includes(code)) return "medium";
  return "low";
}

function analyzeTsErrors(projectPath: string): PrioritizedError[] {
  // Загружаем конфигурацию проекта
  const configPath = ts.findConfigFile(
    projectPath,
    ts.sys.fileExists,
    "tsconfig.json"
  );
  if (!configPath) {
    throw new Error("Could not find tsconfig.json");
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedCommandLine = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  // Создаем программу
  const program = ts.createProgram(
    parsedCommandLine.fileNames,
    parsedCommandLine.options
  );

  const errors: PrioritizedError[] = [];

  // Собираем все диагностики
  const diagnostics = [
    ...program.getSemanticDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getGlobalDiagnostics(),
  ];

  // Преобразуем диагностики в приоритизированный список ошибок
  diagnostics.forEach((diagnostic) => {
    if (!diagnostic.file) return;

    const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start!
    );
    const message = ts.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n"
    );
    const code = diagnostic.code;
    const priority = getPriorityByErrorCode(code);

    errors.push({
      priority,
      code,
      message,
      file: diagnostic.file.fileName,
      line: line + 1, // Линии в TypeScript индексируются с 0
      column: character + 1,
    });
  });

  return errors;
}

function printErrorReport(errors: PrioritizedError[]) {
  // Сортировка ошибок по приоритету
  errors.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  // Группировка ошибок по приоритету
  const grouped: Record<string, PrioritizedError[]> = {
    critical: [],
    high: [],
    medium: [],
    low: [],
  };

  errors.forEach((error) => {
    grouped[error.priority].push(error);
  });

  // Формирование отчета
  console.log("# TypeScript Errors Prioritized Report\n");

  for (const [priority, priorityErrors] of Object.entries(grouped)) {
    if (priorityErrors.length === 0) continue;

    console.log(
      `## ${priority.toUpperCase()} Priority Errors (${
        priorityErrors.length
      })\n`
    );

    // Добавляем описание приоритета
    const priorityDescriptions = {
      critical:
        "These errors will definitely cause runtime issues and should be fixed immediately",
      high: "These errors have a high likelihood of causing runtime issues",
      medium: "May cause problems under certain conditions",
      low: "Mostly type-safety issues that might not affect runtime behavior",
    };

    console.log(
      `${priorityDescriptions[priority as keyof typeof priorityDescriptions]}\n`
    );

    // Добавляем таблицу ошибок
    console.log("| File | Line:Column | Error Code | Message |");
    console.log("|------|-------------|------------|--------|");

    priorityErrors.forEach((err) => {
      const relativeFile = path.relative(process.cwd(), err.file);
      const location = `${err.line}:${err.column}`;
      console.log(
        `| ${relativeFile} | ${location} | TS${
          err.code
        } | ${err.message.replace(/\|/g, "\\|")} |`
      );
    });

    console.log("");
  }

  // Вывод краткой статистики
  console.log("\nError Statistics:");
  console.log(`- Critical: ${grouped.critical.length}`);
  console.log(`- High: ${grouped.high.length}`);
  console.log(`- Medium: ${grouped.medium.length}`);
  console.log(`- Low: ${grouped.low.length}`);
  console.log(`- Total: ${errors.length}`);
}

// Основная функция
function main() {
  const projectPath = process.cwd(); // Используем текущую директорию по умолчанию

  console.log(`Analyzing TypeScript errors in ${projectPath}...`);

  try {
    const errors = analyzeTsErrors(projectPath);
    printErrorReport(errors);
  } catch (error) {
    console.error("Error analyzing TypeScript project:", error);
    process.exit(1);
  }
}

main();
