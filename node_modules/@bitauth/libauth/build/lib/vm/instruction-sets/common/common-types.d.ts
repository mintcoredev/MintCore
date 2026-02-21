import type { AuthenticationInstruction, AuthenticationProgramCommon, AuthenticationProgramStateAlternateStack, AuthenticationProgramStateCommon, AuthenticationProgramStateControlStack, AuthenticationProgramStateError, AuthenticationProgramStateStack, Input, Operation, Output, TransactionCommon } from '../../../lib.js';
export declare const undefinedOperation: <State extends AuthenticationProgramStateControlStack & AuthenticationProgramStateError>(state: State) => State;
export declare const checkLimitsCommon: <State extends AuthenticationProgramStateAlternateStack & AuthenticationProgramStateError & AuthenticationProgramStateStack & {
    operationCount: number;
}>(operation: Operation<State>) => Operation<State>;
/**
 * @deprecated use `structuredClone` instead
 */
export declare const cloneStack: (stack: Uint8Array[]) => Uint8Array[];
export declare const createAuthenticationProgramStateCommon: ({ program, instructions, stack, }: {
    program: AuthenticationProgramCommon;
    instructions: AuthenticationInstruction[];
    stack: Uint8Array[];
}) => AuthenticationProgramStateCommon;
/**
 * @deprecated use `structuredClone` instead
 */
export declare const cloneAuthenticationProgramCommon: <Program extends AuthenticationProgramCommon>(program: Program) => {
    inputIndex: number;
    sourceOutputs: {
        valueSatoshis: bigint;
        token?: {
            nft?: {
                capability: "none" | "mutable" | "minting";
                commitment: Uint8Array;
            } | undefined;
            amount: bigint;
            category: Uint8Array;
        } | undefined;
        lockingBytecode: Uint8Array;
    }[];
    transaction: {
        inputs: {
            outpointIndex: number;
            outpointTransactionHash: Uint8Array;
            sequenceNumber: number;
            unlockingBytecode: Uint8Array;
        }[];
        locktime: number;
        outputs: {
            valueSatoshis: bigint;
            token?: {
                nft?: {
                    capability: "none" | "mutable" | "minting";
                    commitment: Uint8Array;
                } | undefined;
                amount: bigint;
                category: Uint8Array;
            } | undefined;
            lockingBytecode: Uint8Array;
        }[];
        version: number;
    };
};
/**
 * @deprecated use `structuredClone` instead
 */
export declare const cloneAuthenticationProgramStateCommon: <State extends AuthenticationProgramStateCommon>(state: State) => {
    alternateStack: Uint8Array[];
    controlStack: boolean[];
    instructions: AuthenticationInstruction[];
    ip: number;
    lastCodeSeparator: number;
    operationCount: number;
    program: {
        inputIndex: number;
        sourceOutputs: {
            valueSatoshis: bigint;
            token?: {
                nft?: {
                    capability: "none" | "mutable" | "minting";
                    commitment: Uint8Array;
                } | undefined;
                amount: bigint;
                category: Uint8Array;
            } | undefined;
            lockingBytecode: Uint8Array;
        }[];
        transaction: {
            inputs: {
                outpointIndex: number;
                outpointTransactionHash: Uint8Array;
                sequenceNumber: number;
                unlockingBytecode: Uint8Array;
            }[];
            locktime: number;
            outputs: {
                valueSatoshis: bigint;
                token?: {
                    nft?: {
                        capability: "none" | "mutable" | "minting";
                        commitment: Uint8Array;
                    } | undefined;
                    amount: bigint;
                    category: Uint8Array;
                } | undefined;
                lockingBytecode: Uint8Array;
            }[];
            version: number;
        };
    };
    signatureOperationsCount: number;
    signedMessages: ({
        serialization: Uint8Array;
        digest: Uint8Array;
    } | {
        message: Uint8Array;
        digest: Uint8Array;
    })[];
    stack: Uint8Array[];
    error?: string | undefined;
};
/**
 * @deprecated use `structuredClone` instead
 */
export declare const cloneAuthenticationProgramStateBCH: <State extends AuthenticationProgramStateCommon>(state: State) => {
    alternateStack: Uint8Array[];
    controlStack: boolean[];
    instructions: AuthenticationInstruction[];
    ip: number;
    lastCodeSeparator: number;
    operationCount: number;
    program: {
        inputIndex: number;
        sourceOutputs: {
            valueSatoshis: bigint;
            token?: {
                nft?: {
                    capability: "none" | "mutable" | "minting";
                    commitment: Uint8Array;
                } | undefined;
                amount: bigint;
                category: Uint8Array;
            } | undefined;
            lockingBytecode: Uint8Array;
        }[];
        transaction: {
            inputs: {
                outpointIndex: number;
                outpointTransactionHash: Uint8Array;
                sequenceNumber: number;
                unlockingBytecode: Uint8Array;
            }[];
            locktime: number;
            outputs: {
                valueSatoshis: bigint;
                token?: {
                    nft?: {
                        capability: "none" | "mutable" | "minting";
                        commitment: Uint8Array;
                    } | undefined;
                    amount: bigint;
                    category: Uint8Array;
                } | undefined;
                lockingBytecode: Uint8Array;
            }[];
            version: number;
        };
    };
    signatureOperationsCount: number;
    signedMessages: ({
        serialization: Uint8Array;
        digest: Uint8Array;
    } | {
        message: Uint8Array;
        digest: Uint8Array;
    })[];
    stack: Uint8Array[];
    error?: string | undefined;
};
/**
 * @deprecated use `structuredClone` instead
 */
export declare const cloneAuthenticationProgramState: <State extends AuthenticationProgramStateCommon>(state: State) => {
    alternateStack: Uint8Array[];
    controlStack: boolean[];
    instructions: AuthenticationInstruction[];
    ip: number;
    lastCodeSeparator: number;
    operationCount: number;
    program: {
        inputIndex: number;
        sourceOutputs: {
            valueSatoshis: bigint;
            token?: {
                nft?: {
                    capability: "none" | "mutable" | "minting";
                    commitment: Uint8Array;
                } | undefined;
                amount: bigint;
                category: Uint8Array;
            } | undefined;
            lockingBytecode: Uint8Array;
        }[];
        transaction: {
            inputs: {
                outpointIndex: number;
                outpointTransactionHash: Uint8Array;
                sequenceNumber: number;
                unlockingBytecode: Uint8Array;
            }[];
            locktime: number;
            outputs: {
                valueSatoshis: bigint;
                token?: {
                    nft?: {
                        capability: "none" | "mutable" | "minting";
                        commitment: Uint8Array;
                    } | undefined;
                    amount: bigint;
                    category: Uint8Array;
                } | undefined;
                lockingBytecode: Uint8Array;
            }[];
            version: number;
        };
    };
    signatureOperationsCount: number;
    signedMessages: ({
        serialization: Uint8Array;
        digest: Uint8Array;
    } | {
        message: Uint8Array;
        digest: Uint8Array;
    })[];
    stack: Uint8Array[];
    error?: string | undefined;
};
/**
 * A reduced version of {@link AuthenticationProgramCommon} in which some
 * transaction input `unlockingBytecode` values may be undefined. This context
 * is required by the compiler to generate signatures.
 *
 * As of BCH 2022, `sourceOutputs.lockingBytecode` is not required for any
 * signing serialization algorithms. However, this type requires each to be
 * provided in anticipation of a future signing serialization algorithm that
 * supports committing to UTXO bytecode values.
 */
export type CompilationContext<TransactionType extends TransactionCommon<Input<Uint8Array | undefined>>> = {
    inputIndex: number;
    sourceOutputs: Output[];
    transaction: TransactionType;
};
export type CompilationContextCommon = CompilationContext<TransactionCommon<Input<Uint8Array | undefined>>>;
/**
 * This is a meaningless but complete {@link CompilationContextCommon} that uses
 * a different value for each property. This is useful for testing
 * and debugging.
 */
export declare const createCompilationContextCommonTesting: ({ sourceOutputs, inputs, locktime, version, outputs, }?: {
    sourceOutputs?: Output[] | undefined;
    inputs?: Input<Uint8Array | undefined>[] | undefined;
    locktime?: number | undefined;
    version?: number | undefined;
    outputs?: Output<Uint8Array, Uint8Array, bigint>[] | undefined;
}) => CompilationContextCommon;
//# sourceMappingURL=common-types.d.ts.map