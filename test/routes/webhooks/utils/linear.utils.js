const PARENT_LABEL_ID = '2c78e728-d648-455d-8c09-3cd857c7f97e';
const TICKET_ID = 'TEST-1234';

function get_linear_issue_payload({
	actor = {},
	data = {},
	...other
}={}) {
	const payload = {
		action: 'create',
		actor: {
			id: 'b24a83bd-a088-4c08-8062-0846dfd14017',
			name: 'Test User',
			email: 'test@example.com',
			avatarUrl: 'https://example.jpg',
			url: 'https://linear.app/control/profiles/test-com',
			type: 'user',
			...actor
		},
		createdAt: '2025-07-20T13:03:42.405Z',
		data: {
			id: 'd42a1f7c-e7e7-4888-8bfb-107a84c01bf8',
			createdAt: '2025-07-20T13:03:42.405Z',
			updatedAt: '2025-07-20T13:03:42.405Z',
			number: 12,
			title: 'Test issue',
			priority: 0,
			sortOrder: -954,
			prioritySortOrder: -985.07,
			slaType: 'all',
			addedToTeamAt: '2025-07-20T13:03:42.454Z',
			labelIds: [
				'd7ab5170-9d9c-4db2-8bf4-77b4918df906'
			],
			teamId: '8366f4a0-a5d0-4564-8f16-323e15715be2',
			previousIdentifiers: [],
			creatorId: '7d5468b1-6fba-41d5-ab41-1753147d7908',
			stateId: 'ce947bc2-a45e-4eaf-8414-40b11db23e18',
			reactionData: [],
			priorityLabel: 'No priority',
			botActor: null,
			identifier: TICKET_ID,
			url: 'https://linear.app/control/issue/JOC-12/test-issue',
			subscriberIds: [
				'414c5eb5-882f-4d7e-ad7f-a8c113ac1b8f'
			],
			state: {
				id: 'ce947bc2-a45e-4eaf-8414-40b11db23e18',
				color: '#bec2c8',
				name: 'Backlog',
				type: 'backlog'
			},
			project: {
				id: '30e909e8-67a1-4c4f-8f3c-ee9a325e02e4',
				name: 'EM Metrics',
				url: 'https://linear.app/xxxxx/project/yyyyy-zzzzz'
			},
			team: {
				id: '8366f4a0-a5d0-4564-8f16-323e15715be2',
				key: 'TST',
				name: 'example.com'
			},
			labels: [
				{
					id: '7b0553b5-e3e3-4e27-9139-0ccc56db2882',
					color: '#26b5ce',
					name: 'Boilerplate',
					parentId: PARENT_LABEL_ID
				}
			],
			description: null,
			...data
		},
		url: 'https://linear.app/control/issue/TST-12/test-issue',
		type: 'Issue',
		organizationId: '3aba35aa-a5a1-45b7-a8cf-61735dbb9bf0',
		webhookTimestamp: 1753016622592,
		webhookId: '0c5e7c53-1eb1-41ea-be11-12bbeb92031f',
		...other
	};

	return payload;
}

module.exports = {
	TICKET_ID,
	PARENT_LABEL_ID,
	get_linear_issue_payload,
};
