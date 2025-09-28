export interface SummarizationResult {
  tlDr: string;
  bullets: string[];
  actions: ActionItem[];
  metadata?: Record<string, any>;
}

export interface ActionItem {
  text: string;
  priority?: 'low' | 'medium' | 'high';
  dueSuggested?: Date;
  category?: string;
}

export interface LLMProvider {
  name: string;
  summarize(text: string, options?: SummarizationOptions): Promise<SummarizationResult>;
  getSupportedModels(): string[];
  getMaxTokens(): number;
}

export interface SummarizationOptions {
  model?: string;
  language?: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

/**
 * Factory function to create LLM provider based on environment
 */
export function createLLMProvider(): LLMProvider {
  const provider = process.env.LLM_PROVIDER || 'mock';

  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAILLMProvider();
    case 'anthropic':
      return new AnthropicLLMProvider();
    case 'mock':
    default:
      return new MockLLMProvider();
  }
}

// Mock LLM Provider for development/testing
export class MockLLMProvider implements LLMProvider {
  name = 'mock';

  async summarize(text: string, options?: SummarizationOptions): Promise<SummarizationResult> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

    const mockSummaries = {
      tlDr: [
        'Reunión de seguimiento del proyecto con identificación de tareas clave y próximos pasos.',
        'Discusión sobre nuevas funcionalidades y mejoras propuestas para la aplicación.',
        'Llamada con cliente para revisar feedback y establecer próximas iteraciones.',
        'Brainstorming de ideas innovadoras para mejorar la experiencia del usuario.',
      ],
      bullets: [
        ['Revisión del progreso actual del MVP', 'Asignación de nuevas responsabilidades', 'Definición de fechas límite'],
        ['Análisis de funcionalidades requeridas', 'Evaluación de viabilidad técnica', 'Priorización de desarrollo'],
        ['Feedback positivo del cliente', 'Identificación de mejoras menores', 'Planificación de próxima entrega'],
        ['Exploración de nuevas tecnologías', 'Análisis de competencia', 'Definición de roadmap'],
      ],
      actions: [
        [
          { text: 'Completar documentación técnica', priority: 'high' as const, category: 'documentation' },
          { text: 'Revisar casos de prueba QA', priority: 'medium' as const, category: 'testing' },
          { text: 'Coordinar con equipo de diseño', priority: 'medium' as const, category: 'design' },
        ],
        [
          { text: 'Implementar notificaciones push', priority: 'high' as const, category: 'development' },
          { text: 'Configurar sincronización en tiempo real', priority: 'medium' as const, category: 'backend' },
          { text: 'Actualizar documentación de API', priority: 'low' as const, category: 'documentation' },
        ]
      ]
    };

    const randomIndex = Math.floor(Math.random() * mockSummaries.tlDr.length);
    const selectedActions = mockSummaries.actions[Math.floor(Math.random() * mockSummaries.actions.length)];

    // Add suggested due dates to actions
    const actionsWithDates = selectedActions.map((action, index) => ({
      ...action,
      dueSuggested: new Date(Date.now() + (index + 1) * 3 * 24 * 60 * 60 * 1000), // 3, 6, 9 days from now
    }));

    return {
      tlDr: mockSummaries.tlDr[randomIndex],
      bullets: mockSummaries.bullets[randomIndex],
      actions: actionsWithDates,
      metadata: {
        provider: 'mock',
        processingTime: '2.8s',
        inputTokens: Math.floor(text.length / 4), // Rough token estimation
        outputTokens: 150,
        model: 'mock-v1',
      }
    };
  }

  getSupportedModels(): string[] {
    return ['mock-v1', 'mock-fast', 'mock-detailed'];
  }

  getMaxTokens(): number {
    return 4096;
  }
}

// OpenAI LLM Provider
export class OpenAILLMProvider implements LLMProvider {
  name = 'openai';
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }
  }

  async summarize(text: string, options?: SummarizationOptions): Promise<SummarizationResult> {
    try {
      const model = options?.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const language = options?.language || 'español';
      
      const systemPrompt = `Eres un asistente experto en resumir y organizar información. Tu tarea es analizar transcripciones de audio y generar:

1. Un resumen corto (TL;DR) de máximo 100 palabras
2. Una lista de puntos clave (bullets) - máximo 5 puntos
3. Una lista de acciones identificadas con prioridad sugerida

Responde ÚNICAMENTE con un JSON válido en este formato:
{
  "tlDr": "resumen corto aquí",
  "bullets": ["punto 1", "punto 2", "punto 3"],
  "actions": [
    {
      "text": "acción a realizar",
      "priority": "high|medium|low",
      "category": "desarrollo|reunión|documentación|testing|etc"
    }
  ]
}

El contenido debe estar en ${language}. Si no se identifican acciones claras, devuelve un array vacío para actions.`;

      const userPrompt = `Analiza esta transcripción y genera el resumen estructurado:

${text}`;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: options?.temperature || 0.3,
          max_tokens: options?.maxTokens || 1000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error('Invalid JSON response from OpenAI');
      }

      // Add suggested due dates to actions
      const actionsWithDates = (parsed.actions || []).map((action: any, index: number) => ({
        text: action.text,
        priority: action.priority || 'medium',
        category: action.category,
        dueSuggested: new Date(Date.now() + (index + 1) * 3 * 24 * 60 * 60 * 1000), // Stagger dates
      }));

      return {
        tlDr: parsed.tlDr || '',
        bullets: parsed.bullets || [],
        actions: actionsWithDates,
        metadata: {
          provider: 'openai',
          model,
          inputTokens: data.usage?.prompt_tokens,
          outputTokens: data.usage?.completion_tokens,
          totalTokens: data.usage?.total_tokens,
        }
      };

    } catch (error) {
      throw new Error(`OpenAI LLM failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
    ];
  }

  getMaxTokens(): number {
    return 128000; // GPT-4 context limit
  }
}

// Anthropic Claude LLM Provider
export class AnthropicLLMProvider implements LLMProvider {
  name = 'anthropic';
  private apiKey: string;
  private baseURL = 'https://api.anthropic.com/v1';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured. Set ANTHROPIC_API_KEY environment variable.');
    }
  }

  async summarize(text: string, options?: SummarizationOptions): Promise<SummarizationResult> {
    try {
      const model = options?.model || process.env.ANTHROPIC_MODEL || 'claude-3-haiku-20240307';
      const language = options?.language || 'español';

      const prompt = `Eres un asistente experto en resumir y organizar información. Analiza esta transcripción de audio y genera un resumen estructurado.

Transcripción:
${text}

Genera un resumen en ${language} con el siguiente formato JSON:

{
  "tlDr": "resumen corto de máximo 100 palabras",
  "bullets": ["punto clave 1", "punto clave 2", "punto clave 3"],
  "actions": [
    {
      "text": "acción específica a realizar",
      "priority": "high|medium|low",
      "category": "desarrollo|reunión|documentación|testing|etc"
    }
  ]
}

Reglas:
- TL;DR: máximo 100 palabras, conciso y claro
- Bullets: máximo 5 puntos clave
- Actions: solo acciones específicas y realizables
- Si no hay acciones claras, devuelve array vacío
- Responde SOLO con el JSON válido`;

      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'user', content: prompt }
          ],
          temperature: options?.temperature || 0.3,
          max_tokens: options?.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text;

      if (!content) {
        throw new Error('No response content from Anthropic');
      }

      // Extract JSON from response (Claude sometimes adds explanatory text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in Anthropic response');
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error('Invalid JSON response from Anthropic');
      }

      // Add suggested due dates to actions
      const actionsWithDates = (parsed.actions || []).map((action: any, index: number) => ({
        text: action.text,
        priority: action.priority || 'medium',
        category: action.category,
        dueSuggested: new Date(Date.now() + (index + 1) * 3 * 24 * 60 * 60 * 1000),
      }));

      return {
        tlDr: parsed.tlDr || '',
        bullets: parsed.bullets || [],
        actions: actionsWithDates,
        metadata: {
          provider: 'anthropic',
          model,
          inputTokens: data.usage?.input_tokens,
          outputTokens: data.usage?.output_tokens,
        }
      };

    } catch (error) {
      throw new Error(`Anthropic LLM failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }

  getMaxTokens(): number {
    return 200000; // Claude 3 context limit
  }
}

// Export the factory function and singleton
export const llmProvider = createLLMProvider();