// Type definitions for internal Cucumber structures

export interface IParameterType {
    name: string;
    regexpStrings: string[];
    type?: { name: string };
}

export interface IParameterTypeRegistry {
    parameterTypes: IParameterType[];
}

export interface IStepDefinition {
    id: string;
    pattern?: string | RegExp;
    expression?: {
        parameterNames?: string[];
    };
    line?: number;
    uri?: string;
    options?: {
        uri?: string;
    };
    code?: (...args: any[]) => any;
    matchesStepName?: (text: string) => boolean;
}

export interface ISupportCodeLibrary {
    parameterTypeRegistry: IParameterTypeRegistry;
    stepDefinitions: IStepDefinition[];
}
