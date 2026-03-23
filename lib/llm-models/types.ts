export interface LLMModelAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  generate(prompt: string): Promise<string>;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  description: string;
}
