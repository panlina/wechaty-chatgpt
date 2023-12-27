var { default: OpenAI } = require('openai');
class Session {
	/**
	 * @param {object} argument
	 * @param {import("openai").ClientOptions} argument.clientOptions
	 * @param {Omit<import("openai").OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'n' | 'messages'>} argument.chatCompletionOptions
	 * @param {string} [argument.systemMessage]
	 * @param {{ schema: import('openai').OpenAI.ChatCompletionCreateParams.Function, implementation: (args: any) => Promise<string> }[]} [argument.functions]
	 */
	constructor({ clientOptions, chatCompletionOptions, systemMessage, functions }) {
		this.api = new OpenAI(clientOptions);
		this.chatCompletionOptions = chatCompletionOptions;
		/** @type {import("openai").OpenAI.ChatCompletionMessageParam[]} */
		this.messages = systemMessage ? [{ role: 'system', content: systemMessage }] : [];
		this.functions = functions;
	}
	/** @param {string} message */
	async send(message) {
		var l = this.messages.length;
		try {
			this.messages.push({ role: 'user', content: message });
			var response = await this.api.chat.completions.create({
				messages: this.messages,
				functions: this.functions?.length ? this.functions.map(f => f.schema) : undefined,	// avoid `[] is too short - 'functions'` error
				...this.chatCompletionOptions
			});
			var choice = response.choices[0];
			while (choice.finish_reason == 'function_call') {
				var function_call = choice.message.function_call;
				var call = { name: function_call.name, arguments: JSON.parse(function_call.arguments) };
				this.messages.push(choice.message);
				this.messages.push({
					role: 'function',
					name: call.name,
					content: await this.executeFunction(call)
				});
				var response = await this.api.chat.completions.create({
					messages: this.messages,
					functions: this.functions?.length ? this.functions.map(f => f.schema) : undefined,	// avoid `[] is too short - 'functions'` error
					...this.chatCompletionOptions
				});
				var choice = response.choices[0];
			}
			this.messages.push(choice.message);
			return choice.message.content;
		}
		catch (e) {
			this.messages.length = l;
			throw e;
		}
	}
	/** @param {{ name: string, arguments: any }} call */
	executeFunction(call) {
		var f = this.functions.find(f => f.schema.name == call.name);
		return f.implementation(call.arguments);
	}
}
module.exports = Session;
