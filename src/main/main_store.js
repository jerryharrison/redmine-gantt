(function(exports){
	'use strict';


	const dispatcher = require('./main_dispatcher.js');
	const EventEmitter = require('events').EventEmitter;
	const Issue = require('../Data/issue.js').Issue;
	const Colors = require('material-ui').Styles.Colors;

	const ExtendsDate = require('../Extends/extend_date.js').ExtendsDate;

	exports.__proto__ = EventEmitter.prototype;

	var _loadStatus;
	var _projects = [];
	var _issues = new Map();
	var _users = new Map();
	var _statuses = new Map();
	var _trackers = new Map();
	var _colors = [];
	var _selectedTracker = -1;
	var _selectedStatus = -1;
	var _issueWindowState = {
		isOpen : false,
		modalType : 'Add',
		modalObject : {}
	};

	exports.setLoadStatus = function(nextStatus)
	{
		_loadStatus = nextStatus;
		this.emit('load-status');
	};

	function setProjectVirtual(data, target, callback)
	{
		JSON.parse(data).projects.some(function(project){
			if (project.name.indexOf(target) == -1 &&
			undefined == _projects.find(function(item){
				if (project.parent == undefined) return false;
				if (item.id == project.parent.id) return item;
				return false;
			})) return false;

			if(callback !== undefined && typeof callback == 'function')
				callback(project);

			project.expand = true;
			project.parent_id = (project.parent == undefined) ? 0 : project.parent.id;
			_projects.push(project);
		});

		exports.emit('projects');
	}

	exports.setProjects = function(data, target)
	{
		_projects = [];
		setProjectVirtual(data, target);
	};

	exports.updateProjects = function(data, target)
	{
		setProjectVirtual(data, target, function(project){
			// update project when data contains same project
			_projects.some(function(item, index, array){
				if(item.id == project.id)
				{
					array.pop(item);
					return true;
				}
			});
		});
	};

	exports.getProject = function(projectId)
	{
		var ret = undefined;
		_projects.some(function(item){
			if(item.id == projectId)
			{
				ret = item;
				return true;
			}
		});

		return ret;
	};

	exports.changeProjectToggle = function(projectId)
	{
		var project = exports.getProject(projectId);
		project.expand = !project.expand;
		exports.emit('issues');
	};

	exports.setUsers = function(data, projectId)
	{
		var usersInProject = [];
		var memberships = JSON.parse(data).memberships;
		memberships.some(function(membership){
			if(membership.user != undefined)
			{
				var user = exports.Users(membership.user.id);
				if (user == undefined)
				{
					user = membership.user;
					user.color = _getColor();
				}
				usersInProject.push(user);
			}
		});

		_users.set(projectId, usersInProject);
		this.emit('users');
	};

	function getProjectIssuesFromJSON(data, projectId)
	{
		return JSON.parse(data).issues.filter(function(item){
			if(item.project.id == projectId) return true;
		}).map(function(item){
			return Issue.toIssueFromJSON(item);
		});
	}

	exports.setIssues = function(data, projectId)
	{
		var issues = getProjectIssuesFromJSON(data, projectId);

		_issues.set(projectId, issues);
		this.emit('issues');
	};

	exports.updateIssues = function(data, projectId)
	{
		getProjectIssuesFromJSON(data, projectId).some(function(updated){
			_issues.get(projectId).some(function(old){
				if(updated.id == old.id)
				{
					Issue.copyTo(old, updated);
					return true;
				}
			});
		});

		this.emit('issues');
	};

	exports.updateIssueDate = function(id, value, type)
	{
		var item = undefined;
		for(var issues of _issues.values())
		{
			issues.some(function(issue){
				if (issue.id == id)
				{
					item = issue;
					return true;
				}
			});
			if (item != undefined) break;
		}


		var satrtDate = new ExtendsDate(item.startDate);
		var dueDate = new ExtendsDate(item.dueDate);
		if (type == 'start')
		{
			satrtDate.addDate(value);
			if (dueDate >=  satrtDate)
				item.startDate = satrtDate.toRedmineFormatString();
		}
		if (type == 'due')
		{
			dueDate.addDate(value);
			if (dueDate >=  satrtDate)
				item.dueDate = dueDate.toRedmineFormatString();
		}

		exports.emit('issues');
	};

	exports.setIssueStatuses = function(data)
	{
		var statuses = JSON.parse(data).issue_statuses;

		statuses.some(function(status){
			_statuses.set(status.id, status);
		});

		this.emit('issue-statuses');
	};

	exports.setTrackers = function(data)
	{
		var trackers = JSON.parse(data).trackers;

		trackers.some(function(tracker){
			_trackers.set(tracker.id, tracker);
		});

		this.emit('trackers');
	};

	exports.setIssueWindowState = function(isOpen, modalType, modalObject)
	{
		_issueWindowState.isOpen = isOpen;
		_issueWindowState.modalType = modalType;
		_issueWindowState.modalObject = modalObject;
		this.emit('issue-window-state');
	};

	exports.updateSelectedTracker = function(tracker)
	{
		_selectedTracker = tracker;
		this.emit('issues');
	};

	exports.updateSelectedStatus = function(status)
	{
		_selectedStatus = status;
		this.emit('issues');
	};

	exports.LoadStatus = function()
	{
		return _loadStatus;
	};

	exports.Projects = function()
	{
		return _projects;
	};

	exports.GetProjectUsers = function(projectId)
	{
		return (_users.get(projectId) == undefined) ? [] : _users.get(projectId);
	};

	exports.Users = function(userId)
	{
		var ret = undefined;

		_users.forEach(function(users){
			users.some(function(user){
				if (user.id == userId)
				{
					ret = user;
					return true;
				}
			});
			if (ret !== undefined) return ret;
		});

		return ret;
	};

	exports.Issues = function(projectId)
	{
		var issues = _issues.get(projectId);
		if (issues === undefined) return [];

		// no expand project' issues are not showed
		var project = exports.getProject(projectId);
		if(!project.expand) return [];

		var tracker = exports.Trackers().get(_selectedTracker);
		var issueStatus = exports.IssueStatuses().get(_selectedStatus);
		if (tracker === undefined && issueStatus === undefined) return issues;

		return issues.filter(function(item){
			if ((tracker == undefined || item.trackerId == _selectedTracker) &&
				(issueStatus == undefined || item.statusId == _selectedStatus)) return true;
			return false;
		});
	};

	exports.IssueStatuses = function()
	{
		return _statuses;
	};

	exports.Trackers = function()
	{
		return _trackers;
	};

	exports.issueWindowState = function()
	{
		return _issueWindowState;
	};

	dispatcher.register(function(action){
		switch(action.actionType)
		{
		case 'projects-get':
			exports.setProjects(action.data, action.target);
			break;

		case 'projects-update':
			exports.updateProjects(action.data, action.target);
			break;

		case 'issues-get':
			exports.setIssues(action.data, action.id);
			break;

		case 'issues-gupdate':
			exports.updateIssues(action.data, action.id);
			break;

		case 'users-get':
			exports.setUsers(action.data, action.id);
			break;

		case 'issue-statuses-get':
			exports.setIssueStatuses(action.data);
			break;

		case 'trackers-get':
			exports.setTrackers(action.data);
			break;

		case 'issue-window-state-update':
			exports.setIssueWindowState(action.isOpen, action.modalType, action.modalObject);
			break;

		case 'data-load-start':
			exports.setLoadStatus(true);
			break;

		case 'data-load-finish':
			exports.setLoadStatus(false);
			break;

		case 'selected-tracker-update':
			exports.updateSelectedTracker(action.tracker);
			break;

		case 'selected-status-update':
			exports.updateSelectedStatus(action.status);
			break;

		case 'change-project-toggle':
			exports.changeProjectToggle(action.id);
			break;

		case 'update-issue-date':
			exports.updateIssueDate(action.id, action.value, action.type);
			break;
		}
	});

	var colorNum = 0;
	var _getColor = function()
	{
		return _colors[colorNum++];
	};

	(function initColors(){
		_colors.push(Colors.red500);
		_colors.push(Colors.indigo500);
		_colors.push(Colors.teal500);
		_colors.push(Colors.yellow500);
		_colors.push(Colors.pink500);
		_colors.push(Colors.blue500);
		_colors.push(Colors.green500);
		_colors.push(Colors.amber500);
		_colors.push(Colors.purple500);
		_colors.push(Colors.loghtBlue500);
		_colors.push(Colors.lightGreen500);
		_colors.push(Colors.orange500);
		_colors.push(Colors.deeppurple500);
		_colors.push(Colors.cyan500);
		_colors.push(Colors.lime500);
		_colors.push(Colors.deepOrange);
	})();
})(this);
