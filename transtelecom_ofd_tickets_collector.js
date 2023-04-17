void function ttcofdtc() {
const cfg = {
	logTab: '--------',
	pauses: {
		shift: 5000,
		ticket: 2000,
	},
	sec_ch_ua_header: "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
	ermsg: {
		noStartDate: '#start_date === null',
		noEndDate: '#end_date === null',
		noTicketsButtons: 'ticketsButtons.length <= 0',
		noShiftID: 'no data-shift-id',
		ticketsListDataIsNotArray: 'ticketsList.data is not Array',
		noShiftNumber: 'shift-number is null',
		noTicketID: 'ticket.id is undefined',
	},
};
const ttcofdtcResult = {
	cashID: null,
	datesRange: null,
	shifts: {},
};
const state = {
	dates: null,
	cashID: null,
	referrer: null,
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
const dataWorker = {
	getDates() {
		const startDateInput = document.querySelector('#start_date');
		const endDateInput = document.querySelector('#end_date');

		validation.assert(startDateInput !== null, cfg.ermsg.noStartDate);
		validation.assert(endDateInput !== null, cfg.ermsg.noEndDate);

		return {
			start: startDateInput.getAttribute('value'),
			end: endDateInput.getAttribute('value'),
		};
	},
	getConvertedTicket(ticket) {
		const result = {
			items: [],
			dateTime: ticket.date_time,
			fiscalMark: ticket.fiscal_mark,
			payments: ticket.ticket_payments,
		};
		for (const item of ticket.ticket_items) {
			result.items.push({
				name: item.name,
				price: item.price,
				amount: item.quantity.split('.')[0]
			});
		}
		return result;
	},
};
const fetcher = {
	ticketsList(cashID, shiftID, startDate, endDate, sec_ch_ua_header, referrer) {
		return fetch(
			'https://ofd1.kz/ajax/tickets_list?cash_id=' + cashID + 
			'&shift_id=' + shiftID + '&start_date=' + startDate + '&end_date=' + endDate, {
		  	"headers": {
			    "accept": "*/*",
			    "accept-language": "ru,en-US;q=0.9,en;q=0.8,bg;q=0.7",
			    "sec-ch-ua": sec_ch_ua_header,
			    "sec-ch-ua-mobile": "?0",
			    "sec-ch-ua-platform": "\"Windows\"",
			    "sec-fetch-dest": "empty",
			    "sec-fetch-mode": "cors",
			    "sec-fetch-site": "same-origin"
		  	},
		  	"referrer": referrer,
		  	"referrerPolicy": "strict-origin-when-cross-origin",
		  	"body": null,
		  	"method": "GET",
		  	"mode": "cors",
		  	"credentials": "include"
		});
	},
	showTicketByID(id, startDate, endDate, sec_ch_ua_header, referrer) {
		return fetch('https://ofd1.kz/ajax/show_ticket_by_id?id=' + 
			id + '&start_date=' + startDate + '&end_date=' + endDate, {
		  	"headers": {
		    	"accept": "*/*",
			    "accept-language": "ru,en-US;q=0.9,en;q=0.8,bg;q=0.7",
			    "sec-ch-ua": sec_ch_ua_header,
			    "sec-ch-ua-mobile": "?0",
			    "sec-ch-ua-platform": "\"Windows\"",
			    "sec-fetch-dest": "empty",
			    "sec-fetch-mode": "cors",
			    "sec-fetch-site": "same-origin"
		  	},
		  	"referrer": referrer,
		  	"referrerPolicy": "strict-origin-when-cross-origin",
		  	"body": null,
		  	"method": "GET",
		  	"mode": "cors",
		  	"credentials": "include"
		});
	},
};

const manager = {
	log: console.log,
	pause(ms) {
		return new Promise(function (resolve) {
			setTimeout(resolve, ms);
		});
	},
	async work() {
		manager.log(cfg.logTab, 'Инициализация...');
		state.dates = dataWorker.getDates();
		ttcofdtcResult.datesRange = state.dates;
		manager.log(cfg.logTab, cfg.logTab, 'Даты извлечены:');
		manager.log(cfg.logTab, cfg.logTab, state.dates);
		state.referrer = document.location.href;

		const ticketsButtons = [...document.querySelectorAll('button[data-shift-id]')];
		validation.assert(ticketsButtons.length > 0, cfg.ermsg.noTicketsButtons);
		manager.log(cfg.logTab, cfg.logTab, 'Смены собраны: ', ticketsButtons.length);
		state.cashID = ticketsButtons[0].getAttribute('data-cash-id');
		ttcofdtcResult.cashID = state.cashID;
		await manager.handleTicketsCollecting(ticketsButtons);
		console.log(JSON.stringify(ttcofdtcResult));
	},
	async handleTicketsCollecting(ticketsButtons) {
		manager.log(cfg.logTab, 'Cбор чеков...');
		for (let ticketsButtonIndex = 0; ticketsButtonIndex < ticketsButtons.length; ticketsButtonIndex++) {
			manager.log(cfg.logTab, 'Смена ', ticketsButtonIndex+1, '/', ticketsButtons.length);
			await manager.handleTicketsButton(ticketsButtons[ticketsButtonIndex]);
		}
	},
	async handleTicketsButton(ticketsButton) {
		const shiftID = ticketsButton.getAttribute('data-shift-id');
		validation.assert(shiftID !== null, cfg.ermsg.noShiftID);
		
		const ticketsListResponse = await fetcher.ticketsList(
			state.cashID, shiftID,
			state.dates.start, state.dates.end,
			cfg.sec_ch_ua_header, state.referrer 
		);
		const ticketsList = await ticketsListResponse.json();
		validation.assert(Array.isArray(ticketsList.data), cfg.ermsg.ticketsListDataIsNotArray);
		manager.log(cfg.logTab, cfg.logTab, 'Получено сырых чеков: ', ticketsList.data.length);
		const filteredTicketsArray = ticketsList.data.filter(
			item => item.operation_type === 'OPERATION_SELL'
		);
		manager.log(cfg.logTab, cfg.logTab, 'Отфильтровано сырых чеков: ', filteredTicketsArray.length);
		const shiftNumber = ticketsButton.getAttribute('shift-number');
		validation.assert(shiftNumber !== null, cfg.ermsg.noShiftNumber);
		
		ttcofdtcResult.shifts[shiftNumber] = [];
		
		for (let metaTicketIndex = 0; metaTicketIndex < filteredTicketsArray.length; metaTicketIndex++) {
			manager.log(cfg.logTab, cfg.logTab, cfg.logTab, 'Конвертирование чека: ', metaTicketIndex+1, '/', filteredTicketsArray.length);
			await manager.handleMetaTicket(filteredTicketsArray[metaTicketIndex], shiftNumber);
		}
		manager.log(cfg.logTab, cfg.logTab, 'Пауза: ', cfg.pauses.shift/1000, ' секунд');
		await manager.pause(cfg.pauses.shift);
	},
	async handleMetaTicket(metaTicket, shiftNumber) {
		validation.assert(metaTicket.id !== undefined, cfg.ermsg.noTicketID);
		const ticketResponse = await fetcher.showTicketByID(
			metaTicket.id, state.dates.start, state.dates.end,
			cfg.sec_ch_ua_header, state.referrer
		);
		const ticket = await ticketResponse.json();
		ttcofdtcResult.shifts[shiftNumber].push(
			dataWorker.getConvertedTicket(ticket)
		);
		manager.log(cfg.logTab, cfg.logTab, cfg.logTab, 'Пауза: ', cfg.pauses.ticket/1000, ' секунд');
		await manager.pause(cfg.pauses.ticket);
	},
};

validation.try(manager.work);

} ();
