const { VK, Keyboard } = require("vk-io");
const fetch = require("node-fetch");
const key = require("./key");
const token = require("./token");

const vk = new VK({
	token: token,
});

vk.updates.on("message", (context, next) => {
	const { messagePayload } = context;

	context.state.command =
		messagePayload && messagePayload.command ? messagePayload.command : null;

	return next();
});

// Simple wrapper for commands
const hearCommand = (name, conditions, handle) => {
	if (typeof handle !== "function") {
		handle = conditions;
		conditions = [`/${name}`];
	}

	if (!Array.isArray(conditions)) {
		conditions = [conditions];
	}

	vk.updates.hear(
		[(text, { state }) => state.command === name, ...conditions],
		handle
	);
};

// Handle start button
hearCommand("start", (context, next) => {
	context.state.command = "help";

	return Promise.all([context.send("Hello!"), next()]);
});

hearCommand("help", async context => {
	await context.send({
		message: `
			Список команд:
			/help - Помощь
			/uni - Через сколько электричка от Университета в сторону Балтийского вокзала
			/balt - Через сколько электричка от Балтийского в сторону Университета
		`,
		keyboard: Keyboard.keyboard([
			Keyboard.textButton({
				label: "Помощь",
				payload: {
					command: "help",
				},
				color: Keyboard.PRIMARY_COLOR,
			}),
			Keyboard.textButton({
				label: "От Университета до Балтийской",
				payload: {
					command: "uni",
				},
				color: Keyboard.POSITIVE_COLOR,
			}),
			Keyboard.textButton({
				label: "От Балтийской до Университета",
				payload: {
					command: "balt",
				},
				color: Keyboard.POSITIVE_COLOR,
			}),
		]),
	});
});

async function getRaces(from, to) {
	let timeToApi = "";
	let dt = new Date();
	let month = dt.getMonth() + 1;
	timeToApi += dt.getFullYear() + "-" + month + "-" + dt.getDate();
	let races = await fetch(
		`https://api.rasp.yandex.net/v3.0/search/?apikey=${key}&format=json&from=${from}&to=${to}&lang=ru_RU&transoprt_types=suburban&page=1&date=${timeToApi}`
	);
	let data = await races.json();

	let str = "";
	let rightArr = await ee(await data.segments);
	let date = new Date(Date.parse(await rightArr[0]));
	let dateStr = date.getHours() + ":" + date.getMinutes();
	let timeDifference = new Date(
		Date.parse(await rightArr[0]) - new Date().getTime()
	);

	str = `Ближайшая электричка в ${dateStr}
        У вас есть ${timeDifference.getMinutes()} минут ${timeDifference.getSeconds()} секунд, чтобы дойти до неё 😼`;
	return str;
}
async function ee(arr) {
	let bb = [];
	const waitTime = 12200000; //2 hours
	for (let i in arr) {
		if (
			Date.parse(arr[i].arrival) <= new Date().getTime() + waitTime &&
			Date.parse(arr[i].arrival) >= new Date().getTime()
		) {
			bb.push(arr[i].arrival);
		}
	}
	return bb;
}

hearCommand("uni", async context => {
	await Promise.all([
		context.send("Вычисляем 🤖"),
		context.send("Университет - Балтийский"),
		context.send(await getRaces("s9603770", "s9602498")),
	]);
	//https://api.rasp.yandex.net/v3.0/search/?apikey={ключ}&format=json&from=c146&to=c213&lang=ru_RU&page=1&date=2015-09-02
});

hearCommand("balt", async context => {
	await Promise.all([
		context.send("Балтийский - Университет 🤖🤖🤖 "),
		context.send(await getRaces("s9602498", "s9603770")),
	]);
});
vk.updates.start().catch(console.error);
