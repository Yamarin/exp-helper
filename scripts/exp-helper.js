// Experience Helper for Foundry VTT v12, Pathfinder 2e v6

class ExperienceGiver {
	static init() {
		console.log('Experience Helper | Initializing');
		game.settings.register('exp-helper', 'activeParty', {
			name: 'Active Party',
			hint: 'Selected characters for XP distribution',
			scope: 'world',
			config: false,
			type: Array,
			default: []
		});
	}

	static menuButton() {
		return $(`<button class="exp-helper-button">
			<i class="fas fa-star"></i> XP Manager
		</button>`).click(() => {
			this.openWindow();
			$('.exp-helper-menu').hide();
		});
	}

	static async openWindow() {
		const html = this.getWindowHTML();
		let dlg = null;
		dlg = new Dialog({
			title: 'Experience Manager',
			content: html,
			buttons: {},
			default: 'close',
			width: 270,
			render: (htmlElem) => {
				htmlElem.find('.give-xp-button').on('click', () => {
					this.giveXP(htmlElem);
					if (dlg) dlg.close();
				});
				htmlElem.find('input[name="actor"]').on('change', () => this.saveParty(htmlElem));
			}
		});
		dlg.render(true);
	}

	static getWindowHTML() {
		const actors = this.getAvailableActors();
		const selectedActors = game.settings.get('exp-helper', 'activeParty');
		let actorsHTML = '';
		actors.forEach(actor => {
			const isChecked = selectedActors.includes(actor.id) ? 'checked' : '';
			actorsHTML += `
				<div class="actor-checkbox">
					<input type="checkbox" name="actor" value="${actor.id}" id="actor-${actor.id}" ${isChecked}>
					<label for="actor-${actor.id}">${actor.name}</label>
				</div>
			`;
		});
		return `
			<div class="xp-manager">
				<div class="form-group">
					<label>Select Party Members:</label>
					<div class="actor-list">
						${actorsHTML}
					</div>
				</div>
				<div class="form-group">
					<label>XP Amount:</label>
					<input type="number" name="xp-amount" min="0" max="500" value="">
				</div>
				<button class="give-xp-button">Give XP</button>
			</div>
		`;
	}

	static getAvailableActors() {
		return game.actors.filter(actor => actor.type === 'character' && actor.hasPlayerOwner);
	}

	static async saveParty(html) {
		const selectedActors = html.find('input[name="actor"]:checked').map(function() {
			return $(this).val();
		}).get();
		await game.settings.set('exp-helper', 'activeParty', selectedActors);
	}

	static humorousSentences = [
		"Dobra robota... jak na was.",
		"Starania były. Dobrze, że byli też inni.",
		"Ryzyko się opłaca. Choć może nie wam.",
		"Rodziców rozpiera duma... chyba.",
		"Lekcja zamiast EXP. Klasyk.",
		"EXP nie śmierdzi, ale trzeba się umyć.",
		"Mogło być gorzej. Ale i tak boli.",
		"Przygoda czeka. EXP – niekoniecznie.",
		"EXP macie, ale zapomnieć się nie da.",
		"EXP? Chyba napiwek w taniej karczmie.",
		"Przynajmniej nie zginęliście. Jeszcze.",
		"EXP jest. Stylu – nadal brak.",
		"Awans? Może za kilka epok.",
		"MG patrzy... i się śmieje.",
		"Zdobywcy EXP. EXPerci od porażek.",
		"EXP wpadł. Cud się zdarzył.",
		"Wasze kości płaczą. MG też.",
		"Każdy EXP się liczy. Nawet ten nędzny.",
		"Wasza obecność była... zauważalna."
	];

	static getRandomSentence() {
		const arr = this.humorousSentences;
		return arr[Math.floor(Math.random() * arr.length)];
	}

	static async giveXP(html) {
		const xpAmount = parseInt(html.find('input[name="xp-amount"]').val());
		const selectedActors = game.settings.get('exp-helper', 'activeParty');
		if (isNaN(xpAmount) || xpAmount < 0 || xpAmount > 500) {
			ui.notifications.error('Please enter a valid XP amount between 0 and 500');
			return;
		}
		if (selectedActors.length === 0) {
			ui.notifications.error('No actors selected in the party');
			return;
		}
		let actorNames = [];
		for (const actorId of selectedActors) {
			const actor = game.actors.get(actorId);
			if (actor) {
				actorNames.push(actor.name);
				const currentXP = actor.system.details.xp.value || 0;
				await actor.update({
					'system.details.xp.value': currentXP + xpAmount
				});
			}
		}
		const namesStr = actorNames.join(', ');
		const sentence = this.getRandomSentence();
		const content = `<span style='font-weight: bold;'>${namesStr} otrzymują <span style='color: #6c1aff;'>${xpAmount} EXP</span>!</span><br><span style='font-style: italic; color: #43a047;'>${sentence}</span>`;
		ChatMessage.create({
			content,
			whisper: [],
			speaker: { alias: 'GM' }
		});
		ui.notifications.info(`Added ${xpAmount} XP to all party members!`);
	}
}

function registerExpHelper() {
	const moduleId = 'exp-helper';
	function tryRegister() {
		if (globalThis.YamaTools) {
			globalThis.YamaTools.registerModule(moduleId, ExperienceGiver);
			console.log('🔵 EXP-HELPER | Module registered with YamaTools');
			return true;
		}
		return false;
	}
	Hooks.once('init', () => {
		console.log('🔵 EXP-HELPER | Init hook called');
		if (!tryRegister()) {
			console.log('🔵 EXP-HELPER | YamaTools not available on init, will retry on ready');
		}
		ExperienceGiver.init();
	});
	// Add button to Token controls menu
	Hooks.on('getSceneControlButtons', controls => {
		// Find the token controls
		const tokenControls = controls.find(c => c.name === 'token');
		if (tokenControls && game.user.isGM) {
			tokenControls.tools.push({
				name: 'exp-helper',
				title: 'Experience Helper',
				icon: 'fas fa-star',
				visible: true, // Only GM sees controls
				onClick: () => ExperienceGiver.openWindow(),
				button: true
			});
		}
	});
	Hooks.once('ready', () => {
		console.log('🔵 EXP-HELPER | Ready hook called');
		if (!tryRegister()) {
			console.log('🔵 EXP-HELPER | YamaTools still not available on ready');
		}
	});
}

registerExpHelper();
