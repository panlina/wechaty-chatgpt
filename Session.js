var { default: OpenAI } = require('openai');
class Session {
	/**
	 * @param {object} argument
	 * @param {import("openai").ClientOptions} argument.clientOptions
	 * @param {Omit<import("openai").OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'n' | 'messages'>} argument.chatCompletionOptions
	 * @param {string} [argument.systemMessage]
	 */
	constructor({ clientOptions, chatCompletionOptions, systemMessage }) {
		this.api = new OpenAI(clientOptions);
		this.chatCompletionOptions = chatCompletionOptions;
		/** @type {import("openai").OpenAI.ChatCompletionMessageParam[]} */
		this.messages = systemMessage ? [{ role: 'system', content: systemMessage }] : [];
	}
	/** @param {string} message */
	async send(message) {
		try {
			this.messages.push({ role: 'user', content: message });
			var response = await this.api.chat.completions.create({
				messages: this.messages,
				...this.chatCompletionOptions
			});
			this.messages.push(response.choices[0].message);
			return response.choices[0].message.content;
		}
		catch (e) {
			this.messages.pop();
			throw e;
		}
	}
}
module.exports = Session;
