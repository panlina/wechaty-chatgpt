/** @typedef { import("wechaty").Wechaty } Wechaty */
/** @typedef { import("wechaty").Room } Room */
/** @typedef { import("wechaty").Message } Message */
/** @typedef { import("wechaty").Sayable } Sayable */
/** @typedef { import("wechaty-puppet").ContactQueryFilter } ContactQueryFilter */
/** @typedef { import("wechaty-puppet").RoomQueryFilter } RoomQueryFilter */
/** @typedef {{ contact: ContactQueryFilter } | { room: RoomQueryFilter }} SayableQueryFilter */

/**
 * @typedef {Object} Config
 * @property {string} apiKey - the api key
 * @property {string | RegExp} prompt - the prompt, which is the leading characters that indicates that a message is sent to chatGPT, e.g. `"@chatGPT "`
 * 
 * When it's `RegExp`, it only specifies the leading characters to be matched, not the whole text. e.g. `/@chatGPT(\u2005|  )/`, not `/^@chatGPT(\u2005|  )(.*)/`.
 */

/**
 * @param {(conversation: Sayable) => Promise<Config | undefined>} config conversation-wise config, where `undefined` will not enable chatGPT
 */
module.exports = function WechatyChatgptPlugin(config) {
	return function (/** @type {Wechaty} */bot) {
		/** @type {{ [conversation: string]: { api: import("chatgpt").ChatGPTAPI, response: import("chatgpt").ChatMessage} }} */
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
					var { ChatGPTAPI } = await import('chatgpt');
					session[conversation.id].api = new ChatGPTAPI({ apiKey: conversationConfig.apiKey });
				}
				try {
					session[conversation.id].response = await session[conversation.id].api.sendMessage(request, {
						promptPrefix: `你是ChatGPT，一个OpenAI训练的大语言模型。回答每个问题的时候尽量简洁（不要太啰嗦）。尽量简洁很重要，一定要记住。`,
						conversationId: session[conversation.id].response?.conversationId,
						parentMessageId: session[conversation.id].response?.id
					});
					conversation.say(session[conversation.id].response.text);
				}
				catch (e) {
					conversation.say("请求失败。chatGPT服务目前不稳定，请稍候重试。");
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
