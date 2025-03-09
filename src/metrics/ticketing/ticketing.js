const { Metric, METRIC_TYPES } = require('../metric');

// Ticketing metrics
// - time_per_ticket
// - time on project = sum(time_per_ticket{project=x})
// - time spent on new capabilities / time on maintenance = ticket_type
// - ticket counter
// - estimation changed value (+estimation_changed_count)

const TICKET_MINUTE_BUCKETS = [
	0,
	5,
	10,
	15,
	25,
	45,
	60, // 1h
	90,
	120, // 2h
	150,
	180, // 3h
	240, // 4h
	300, // 5h
	480, // 8h
	600, // 10h
	900, // 15h
];

const estimation_limits = new Array(26).fill(0).flatMap((_, i) => [-i, i]).sort((a, b) => a - b);
const TICKET_ESTIMATION_BUCKETS = [-Infinity, ...estimation_limits, Infinity];

class TicketCount extends Metric {
	static METRIC_TYPE = METRIC_TYPES.COUNTER;
}

const ticket_count = new TicketCount('ticket_count', {
	unit: 'ticket',
});

class TimePerTicket extends Metric {
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

const time_per_ticket = new TimePerTicket('time_per_ticket', {
	unit: 'minute',
	advice: {
		explicitBucketBoundaries: TICKET_MINUTE_BUCKETS
	}
});

class TicketEstimationChanged extends Metric {
	static METRIC_TYPE = METRIC_TYPES.HISTOGRAM;
}

const ticket_estimation_changed = new TicketEstimationChanged('ticket_estimation_changed', {
	unit: 'points',
	advice: {
		explicitBucketBoundaries: TICKET_ESTIMATION_BUCKETS
	}
});

module.exports = {
	ticket_count,
	time_per_ticket,
	ticket_estimation_changed
};
