import type { AnyCompilerConfiguration, AuthenticationProgramStateControlStack, AuthenticationProgramStateMinimum, AuthenticationProgramStateStack, CompilationContextBCH, CompilationContextCommon, CompilationData, CompilationResult } from '../lib.js';
/**
 * Parse, resolve, and reduce the selected script using the provided `data` and
 * `configuration`.
 *
 * Note, locktime validation only occurs if `compilationContext` is provided in
 * the configuration.
 */
export declare const compileScript: <ProgramState extends AuthenticationProgramStateControlStack & AuthenticationProgramStateMinimum & AuthenticationProgramStateStack = AuthenticationProgramStateControlStack & AuthenticationProgramStateMinimum & AuthenticationProgramStateStack, CompilationContext extends CompilationContextCommon = CompilationContextBCH>(scriptId: string, data: CompilationData<CompilationContext>, configuration: AnyCompilerConfiguration<CompilationContext>) => CompilationResult<ProgramState>;
//# sourceMappingURL=compile.d.ts.map