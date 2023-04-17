void function sesfpc () {
const cfg = {
	ermsg: {
		noEsfTrs: "Ошибка. ЭСФ не найдены в таблице.",
		noRegexBodyMatch: "Ошибка. Регулярное выражение сработало не корректно.",
		noDate: 'Ошибка. На странице печати ЭСФ не извлекается дата совершения оборота.',
		noProductTrs: 'Ошибка. На странице печати не найдены строки продуктов.'
	},
	pauseBetweenRequestsMs: 10000,
};
const state = {
	esfIds: null,
	esfData: {},
};
const validation = {
	assert(boolean, message='assertion') {
		if (boolean) return;
		throw new Error(message);
	},
	async try(callback) {
		try { await callback(); }
		catch (er) {
			console.error(er.stack);
		}
	},	
};
//
const manager = {
	log: console.log,
	pause(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	},
	async run() {
		state.esfIds = manager.collectSiberianESFids();
		manager.log('Найдено ЭСФ от "Сибирского" в таблице: ', state.esfIds.length);

		state.div = manager.createHiddenDiv();
		for (let index = 0; index < state.esfIds.length; index++) {
			const id = state.esfIds[index];
			manager.log('Запрос полной информации ЭСФ: ', index, ' / ', state.esfIds.length);
			const fetchResult = await manager.fetchESFprintPage(id);
			const html = await fetchResult.text();
			const bodyInner = manager.extractBodyInnerHTML(html);
			state.div.innerHTML = bodyInner;
			state.esfData[id] = manager.getESFdata(state.div);
			manager.log('Пауза: ', cfg.pauseBetweenRequestsMs/1000, ' сек.');
			await manager.pause(cfg.pauseBetweenRequestsMs);
		}
		console.log(JSON.stringify(state.esfData, null, 4))
	},
	createHiddenDiv() {
		const div = document.createElement('div');
		div.style.display = 'none';
		document.body.insertAdjacentElement('beforeend', div);
		return div;
	},
	collectSiberianESFids() {
		const result = [];
		const esfTrs = [...document.querySelectorAll('tr[id]')];
		validation.assert(esfTrs.length > 0, cfg.ermsg.noEsfTrs);
		for (const tr of esfTrs) {
			if (!isFinite(tr.id)) continue;
			if ( !(tr.innerText.includes('Сибирское')) ) continue;
			result.push(tr.id);
		}
		return result;
	},
	extractBodyInnerHTML(html) {
		const match = html.match(/<body[^>]+>([^~]+)<\/body/);
		validation.assert(match !== null, cfg.ermsg.noRegexBodyMatch);
		return match[0];
	},
	fetchESFprintPage(id) {
		return fetch(
			'https://esf.gov.kz:8443/esf-web/invoice/print?id=' + id + '&isDraft=false&language=ru'
		);
	},
	getESFdata(div) {
		const dateSpan = div.querySelectorAll('span.field-value')[4];
		validation.assert(dateSpan !== undefined, cfg.ermsg.noDate);
		const products = [];
		const productTrs = [...div.querySelectorAll("tr.service_grid")];
		validation.assert(productTrs.length > 0, cfg.ermsg.noProductTrs);
		for (const tr of productTrs) {
			products.push({
				name: tr.children[2].innerText.trim(),
				amount: tr.children[6].innerText.trim(),
				price: tr.children[7].innerText.trim(),
			});
		}
		return { date: dateSpan.innerText, products };
	}
};

validation.try(manager.run);
} ()
