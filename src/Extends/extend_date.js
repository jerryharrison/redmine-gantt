(function(exports){
	'use strict';


	class ExtendsDate extends Date {};

	ExtendsDate.prototype.toRedmineFormatString = function()
	{
		return ("000" + this.getFullYear()).slice(-4) + "-" + ("0" + (this.getMonth() + 1)).slice(-2) + "-" + ("0" + this.getDate()).slice(-2);
	};

	ExtendsDate.prototype.getTotalDate = function()
	{
		return Math.ceil(this.getTime() / (24 * 60 * 60 * 1000));
	}

	ExtendsDate.prototype.getTotalWeek = function()
	{
		return Math.ceil(this.getTime() / (7 * 24 * 60 * 60 * 1000));
	}

	ExtendsDate.prototype.getWeek = function()
	{
		var firstDay = new ExtendsDate(this.toString());
		firstDay.setMonth(0, 1);
		firstDay.setDate((7 - firstDay.getDay()) % 7 + 1);

		return (new ExtendsDate(this.getTime() - firstDay.getTime()).getTotalWeek() + 1);
	}

	ExtendsDate.prototype.addDate = function(addValue)
	{
		if (Object.prototype.toString.call(addValue).slice(8, -1) !== 'Number') throw new TypeError('argumetn 1 is not number');
		this.setDate(this.getDate() + addValue);
	}

	ExtendsDate.prototype.addMonth = function(addValue)
	{
		if (Object.prototype.toString.call(addValue).slice(8, -1) !== 'Number') throw new TypeError('argumetn 1 is not number');
		this.setMonth(this.getMonth() + addValue);
	}

	exports.ExtendsDate = ExtendsDate;
})(this);
