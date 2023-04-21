var list9160 = {
	log: console.log,
	cfg: {
		lowPrice: 25,
		highPrice: 44000,

		cityId: 267,
		regionId: 22,
		languageId: 9,
		userTimeZone: 6,
		categoryId: 9160,
		productPerPage: 21,
		categoryPerPage: 700,

		isActive: true,
		noMutation: true,
		isDiscount: false,
		isAvailable: true, 
		isNotArchived: true,

		intervalMs: 10000,
		productRequestIdsAmount: 20,
		sec_ch_ua_header: "\"Not_A Brand\";v=\"99\", \"Google Chrome\";v=\"109\", \"Chromium\";v=\"109\"",
	},
	progress: 0,
	intervalIs: null,
	categoryItemResultListInitialLength: null,
	run(cfg) {
		var token = getCookie('token'); // SW api method
		list9160.log('Запрос идентифкаторов всех продуктов...');
		return new Promise((resolve) => {
			list9160.fetch.categoryItem(token, cfg)
			.then( promise => promise.json()
				.then(list9160.collectProduct.list.bind(list9160, token, cfg, resolve))
			);
		});
	},
	collectProduct: {
		list(token, cfg, resolve, categoryItemResult) {
			var productResultsList = [];
			list9160.categoryItemResultListInitialLength = categoryItemResult.List.length;
			list9160.log(
				'Идентификаторов получено: ', list9160.categoryItemResultListInitialLength
			);
			list9160.log('Интервальные запросы продуктов...');
			list9160.log('Режим: ', cfg.productRequestIdsAmount, ' продуктов / ', cfg.intervalMs/1000, ' сек.');
			list9160.intervalId = setInterval(
				list9160.collectProduct.chunk.bind(
					list9160, token, cfg, resolve, categoryItemResult, productResultsList
				), 
				cfg.intervalMs
			);
		},
		chunk(token, cfg, resolve, categoryItemResult, productResultsList) {
			if (categoryItemResult.List.length <= 0) {
				clearInterval(list9160.intervalId);
				resolve( list9160.sift(productResultsList) );
				return;
			}
			list9160.fetch.product(
				list9160.composeIds(cfg, categoryItemResult), token, cfg
			)
			.then(promise => promise.json()
				.then(productResult => {
					productResultsList.push(...productResult.List)
					list9160.progress += cfg.productRequestIdsAmount;
					list9160.log(
						'Прогресс: ', list9160.progress, '/', list9160.categoryItemResultListInitialLength
					);
				})
			);
			categoryItemResult.List = categoryItemResult.List.slice(cfg.productRequestIdsAmount);
		},
	},
	composeIds(cfg, categoryItemResult) {
		var ids = '';
		for (var cursor = 0; cursor < cfg.productRequestIdsAmount; cursor++) {
			if (!categoryItemResult.List[cursor]) break; 
			ids += 'Ids[]=' + categoryItemResult.List[cursor].SourceId + '&'; 
		}
		return ids;
	},
	sift(productList) {
		var result = [];
		for (var line of productList) {
			var simple = {
				options: [],
				code: line.Code,
				price: line.Price,
				url: line.UrlCode,
				points: line.Point,
				weight: line.Weight,
				discount: line.Discount,
				fullName: line.NameFull,
				oldPrice: line.OldPrice,
				useWay: line.UseWayText,
				description: line.Description,
				isOnlyOnline: line.IsOnlyOnline,
				remain: line.ProductSaldo.Volume,
				composition: line.FullComposition,
			};
			if (line.Images[0] && line.Images[0] && line.Images[0].TinyUrl) {
				simple.tinyImageUrl = line.Images[0].TinyUrl;
			}
			if (line.SaleEndDate[0] !== '0') {
				simple.sale = {
					startDate: list9160.beautifySaleDate(line.SaleStartDate),
					endDate: list9160.beautifySaleDate(line.SaleEndDate),
				}
			}
			else if (line.Discount !== 0) {
				simple.sale = {
					startDate: 'месяц',
					endDate: 'месяц',
				}	
			}
			else {
				simple.sale = {
					startDate: '',
					endDate: '',
				}	
			}
			if (line.ProductOptions !== null) {
				for (var option of line.ProductOptions) {
					simple.options.push({
						name: option.Name,
						value: option.Value,
					});
				}
			}
			result.push(simple);
		}
		return result;
	},
	beautifySaleDate(date) {
		var splitted = date.split('T');
		splitted = [splitted[0], ...splitted[1].split('+')];
		return splitted.join(' - ');
	},
	fetch: {
		categoryItem(token, cfg) {
			return fetch(`https://kz.siberianwellness.com/api/v1/categoryItem?CategoryId=${cfg.categoryId}&` + 
				`CurrentPage=1&PerPage=${cfg.categoryPerPage}&LanguageId=${cfg.languageId}&RegionId=${cfg.regionId}&` + 
				`CityId=${cfg.cityId}&IsNotArchived=${cfg.isNotArchived}&IsActive=${cfg.isActive}&` + 
				`IsDiscount=${cfg.isDiscount}&LowPrice=${cfg.lowPrice}&HighPrice=${cfg.highPrice}&` + 
				`IsAvailable=${cfg.isAvailable}&UserTimeZone=${cfg.userTimeZone}`, 
				{
			  		"headers": {
				    "accept": "application/json, text/plain, */*",
				    "sec-ch-ua": cfg.sec_ch_ua_header,
				    "sec-ch-ua-mobile": "?0",
				    "sec-ch-ua-platform": "\"Windows\"",
				    "token": token
				 },
				 "referrer": "https://kz.siberianwellness.com/kz-ru/c/katalog-9160/",
				 "referrerPolicy": "strict-origin-when-cross-origin",
				 "body": null,
				 "method": "GET",
				 "mode": "cors",
				 "credentials": "omit"
			});
		},
		product(ids, token, cfg) {
			return fetch(`https://kz.siberianwellness.com/api/v1/product?${ids}` + 
				`CurrentPage=1&PerPage=${cfg.productPerPage}&LanguageId=${cfg.languageId}&` +
				`RegionId=${cfg.regionId}&CityId=${cfg.cityId}&IsActive=${cfg.isActive}&` +
				`noMutation=${cfg.noMutation}&UserTimeZone=${cfg.userTimeZone}`, {
			  "headers": {
			    "accept": "application/json, text/plain, */*",
			    "accept-language": "ru,en-US;q=0.9,en;q=0.8,bg;q=0.7",
			    "sec-ch-ua": cfg.sec_ch_ua_header,
			    "sec-ch-ua-mobile": "?0",
			    "sec-ch-ua-platform": "\"Windows\"",
			    "sec-fetch-dest": "empty",
			    "sec-fetch-mode": "cors",
			    "sec-fetch-site": "same-origin",
			    "token": token
			  },
			  "referrer": "https://kz.siberianwellness.com/kz-ru/c/katalog-9160/",
			  "referrerPolicy": "strict-origin-when-cross-origin",
			  "body": null,
			  "method": "GET",
			  "mode": "cors",
			  "credentials": "include"
			});
		},
	},
};

list9160.run(list9160.cfg).then(r => list9160.log(JSON.stringify(r,null,4)));
