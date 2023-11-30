const ttcofdtc = { 
	cfg: {
		logTab: '--------',
		pauses: {
			shift: 2000,
			ticket: 5000,
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
	},
	state: {
		dates: null,
		cashID: null,
		referrer: null,
		manualThrow: false,
	},
	result : {
		cashID: null,
		datesRange: null,
		unknownTypeTickets: {},
		shifts: {},
	},
};
void function ttcofdtcFunc() {
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
	getDates(ticketsButton) {
		const startDate = ticketsButton.getAttribute('data-start-date');
		const endDate = ticketsButton.getAttribute('data-end-date');

		validation.assert(startDate !== null, ttcofdtc.cfg.ermsg.noStartDate);
		validation.assert(endDate !== null, ttcofdtc.cfg.ermsg.noEndDate);

		return {
			start: startDate,
			end:  endDate,
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
		manager.log('Инициализация...');
		ttcofdtc.state.referrer = document.location.href;

		const ticketsButtons = [...document.querySelectorAll('button[data-shift-id]')];
		validation.assert(ticketsButtons.length > 0, ttcofdtc.cfg.ermsg.noTicketsButtons);
		manager.log(ttcofdtc.cfg.logTab, 'Смены собраны: ', ticketsButtons.length);
		ttcofdtc.state.dates = dataWorker.getDates(ticketsButtons[0]);
		ttcofdtc.result.datesRange = ttcofdtc.state.dates;
		manager.log(ttcofdtc.cfg.logTab, 'Даты извлечены:');
		manager.log(ttcofdtc.cfg.logTab, ttcofdtc.state.dates);
		ttcofdtc.state.cashID = ticketsButtons[0].getAttribute('data-cash-id');
		ttcofdtc.result.cashID = ttcofdtc.state.cashID;
		await manager.handleTicketsCollecting(ticketsButtons);
		console.log(JSON.stringify(ttcofdtc.result));
	},
	async handleTicketsCollecting(ticketsButtons) {
		manager.log('Cбор чеков...');
		for (let ticketsButtonIndex = 0; ticketsButtonIndex < ticketsButtons.length; ticketsButtonIndex++) {
			manager.log('Смена ', ticketsButtonIndex+1, '/', ticketsButtons.length);
			await manager.handleTicketsButton(ticketsButtons[ticketsButtonIndex]);
		}
	},
	async handleTicketsButton(ticketsButton) {
		const shiftID = ticketsButton.getAttribute('data-shift-id');
		validation.assert(shiftID !== null, ttcofdtc.cfg.ermsg.noShiftID);
		
		const ticketsListResponse = await fetcher.ticketsList(
			ttcofdtc.state.cashID, shiftID,
			ttcofdtc.state.dates.start, ttcofdtc.state.dates.end,
			ttcofdtc.cfg.sec_ch_ua_header, ttcofdtc.state.referrer 
		);
		const ticketsList = await ticketsListResponse.json();
		validation.assert(Array.isArray(ticketsList.data), ttcofdtc.cfg.ermsg.ticketsListDataIsNotArray);
		manager.log(ttcofdtc.cfg.logTab, 'Получено сырых чеков: ', ticketsList.data.length);
		const filteredTicketsArray = ticketsList.data.filter(
			item => item.operation_type === 'OPERATION_SELL'
		);
		manager.log(ttcofdtc.cfg.logTab, 'Отфильтровано сырых чеков: ', filteredTicketsArray.length);
		const shiftNumber = ticketsButton.getAttribute('shift-number');
		validation.assert(shiftNumber !== null, ttcofdtc.cfg.ermsg.noShiftNumber);
		
		const notSellsTicketsArray = ticketsList.data.filter(
			item => item.operation_type !== 'OPERATION_SELL'
		);
		if (notSellsTicketsArray.length !== 0) {
			ttcofdtc.result.unknownTypeTickets[shiftNumber] = notSellsTicketsArray;
		}	

		ttcofdtc.result.shifts[shiftNumber] = [];
		
		for (let metaTicketIndex = 0; metaTicketIndex < filteredTicketsArray.length; metaTicketIndex++) {
			manager.log(ttcofdtc.cfg.logTab, ttcofdtc.cfg.logTab, 'Конвертирование чека: ', metaTicketIndex+1, '/', filteredTicketsArray.length);
			await manager.handleMetaTicket(filteredTicketsArray[metaTicketIndex], shiftNumber);
		}
		manager.log(ttcofdtc.cfg.logTab, 'Пауза: ', ttcofdtc.cfg.pauses.shift/1000, ' секунд');
		await manager.pause(ttcofdtc.cfg.pauses.shift);
	},
	async handleMetaTicket(metaTicket, shiftNumber) {
		if (ttcofdtc.state.manualThrow) {
			throw new Error('manualThrow');
		}
		validation.assert(metaTicket.id !== undefined, ttcofdtc.cfg.ermsg.noTicketID);
		const ticketResponse = await fetcher.showTicketByID(
			metaTicket.id, ttcofdtc.state.dates.start, ttcofdtc.state.dates.end,
			ttcofdtc.cfg.sec_ch_ua_header, ttcofdtc.state.referrer
		);
		const ticket = await ticketResponse.json();
		ttcofdtc.result.shifts[shiftNumber].push(
			dataWorker.getConvertedTicket(ticket)
		);
		manager.log(ttcofdtc.cfg.logTab, ttcofdtc.cfg.logTab, 'Пауза: ', ttcofdtc.cfg.pauses.ticket/1000, ' секунд');
		await manager.pause(ttcofdtc.cfg.pauses.ticket);
	},
};

validation.try(manager.work);

} ();
