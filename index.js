/** @typedef { import("wechaty").Wechaty } Wechaty */
/** @typedef { import("wechaty").Room } Room */
/** @typedef { import("wechaty").Message } Message */
/** @typedef { import("wechaty").Sayable } Sayable */
/** @typedef { import("wechaty-puppet").ContactQueryFilter } ContactQueryFilter */
/** @typedef { import("wechaty-puppet").RoomQueryFilter } RoomQueryFilter */
/** @typedef {{ contact: ContactQueryFilter } | { room: RoomQueryFilter }} SayableQueryFilter */

/**
 * @typedef {Object} Config
 * @property {import("openai").ClientOptions} clientOptions - the options that is passed to `OpenAI` constructor
 * @property {Omit<import("openai").OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, 'n' | 'messages'>} chatCompletionOptions - the options that is passed to chat completion API
 * @property {string} [systemMessage] - the system message
 * @property {string | RegExp} prompt - the prompt, which is the leading characters that indicates that a message is sent to chatGPT, e.g. `"@chatGPT "`
 * 
 * When it's `RegExp`, it only specifies the leading characters to be matched, not the whole text. e.g. `/@chatGPT(\u2005|  )/`, not `/^@chatGPT(\u2005|  )(.*)/`.
 */

var { default: OpenAI } = require('openai');

/**
 * @param {(conversation: Sayable) => Promise<Config | undefined>} config conversation-wise config, where `undefined` will not enable chatGPT
 */
module.exports = function WechatyChatgptPlugin(config) {
	return function (/** @type {Wechaty} */bot) {
		/** @type {{ [conversation: string]: { api: import("openai").OpenAI, messages: import("openai").OpenAI.ChatCompletionMessageParam[] } }} */
		var session = {};
		bot.on("message", listener);
		return () => {
			bot.off("message", listener);
		};
		async function listener(/** @type {Message} */message) {
			var conversation = messageConversation(message);
			var conversationConfig = await config(conversation);
			var request;
			if (conversationConfig && (request = matchText(message.text(), conversationConfig.prompt))) {
				if (!session[conversation.id]) {
					session[conversation.id] = {};
					session[conversation.id].api = new OpenAI(conversationConfig.clientOptions);
					session[conversation.id].messages = [{ role: 'system', content: conversationConfig.systemMessage || `你是ChatGPT，一个OpenAI训练的大语言模型。` }];
				}
				try {
					session[conversation.id].messages.push({ role: 'user', content: request });
					var response = await session[conversation.id].api.chat.completions.create({
						messages: session[conversation.id].messages,
						...conversationConfig.chatCompletionOptions
					});
					session[conversation.id].messages.push(response.choices[0].message);
					conversation.say(response.choices[0].message.content);
				}
				catch (e) {
					session[conversation.id].messages.pop();
					conversation.say("请求失败。");
				}
			}
			/**
			 * @param {string} text
			 * @param {string | RegExp} prompt
			 */
			function matchText(text, prompt) {
				if (typeof prompt == 'string') {
					if (text.startsWith(prompt))
						return text.substr(prompt.length);
				} else if (prompt instanceof RegExp) {
					var match = prompt.exec(text);
					if (match && !match.index)
						return text.substr(match[0].length);
				}
			}
		}
		function messageConversation(/** @type {Message} */message) {
			return message.talker().self() ?
				message.room() || message.to() :
				message.conversation();
		}
	};
};
