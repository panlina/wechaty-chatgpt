# wechaty-chatgpt

A Wechaty chatGPT plugin.

## Usage

```js
var { Wechaty } = require('wechaty');
var WechatyChatgptPlugin = require('wechaty-chatgpt');
var bot = new Wechaty();
bot.use(
	WechatyChatgptPlugin(async conversation => {
		if (conversation.id == 'wxid_xxxxxxxxxxxxxx')
			var prompt = "@chatGPT ";
		else if (conversation.id == '00000000000@chatroom')
			var prompt = /@什么都知道(\u2005|  )/;
		else
			return;
		return {
			apiOptions: { apiKey: "(your-api-key)" },
			prompt: prompt
		};
	})
);
```
