'use strict';

const React = require('react');
const reactDOM = require('react-dom');
const store = require('./main_store.js');
const networkAction = require('./network_action.js');
const uiAction = require('./ui_action.js');

const SearchField = require('./search_field.js').SearchField;
const AddIssueWindow = require('../IssueWindow/issue_window_view.js').AddIssueWindow;
const GanttChart = require('../Chart/gantt_chart.js').GanttChart;
const ProjectList = require('./project_table.js').ProjectList;
const UpdateDialog = require('./update_dialog.js');
const ItemsSelectField = require('./items_select_field.js');

const SelectField = require('material-ui').SelectField;
const MenuItem = require('material-ui').MenuItem;

const ROW_HEIGHT = 36;

var Main = React.createClass({
	getInitialState : function()
	{
		return{
			chartType : 'Week',
			chartDateWidth : 10,
			items : [],
			selectedTracker : -1,
			selectedStatus : -1,
			isIssuwWindowOpen : false,
			isUpdateDialogOpen : false,
			modalType : 'Add',
			modalObject : {}
		};
	},
	componentDidMount : function()
	{
		store.addListener('load-status', this._onLoadStatusChanged);
		store.addListener('projects', this._onProjectsChanged);
		store.addListener('users', this._onDataChanged);
		store.addListener('issues', this._onDataChanged);
		store.addListener('issue-window-state', this._onIssueWindowStateChanged);
		networkAction.loadIssueStatuses();
		networkAction.loadTrackers();
	},
	componentWillUnmount : function()
	{
		store.removeListener('load-status', this._onLoadStatusChanged);
		store.removeListener('projects', this._onProjectsChanged);
		store.removeListener('users', this._onDataChanged);
		store.removeListener('issues', this._onDataChanged);
		store.removeListener('issue-window-state', this._onIssueWindowStateChanged);
	},
	render : function()
	{
		return(
			<div style={{'padding' : 10}}>
				<SearchField search={networkAction.loadProjects}/>
				<div><SelectField value={this.state.chartType} onChange={this._onchartTypeChanged} >
					<MenuItem value='Date' primaryText='Date' />
					<MenuItem value='Week' primaryText='Week' />
				</SelectField></div>
				<div><ItemsSelectField items={store.Trackers()} selectedValue={this.state.selectedTracker} onValueChanged={this._trackerChanged}/>
				<ItemsSelectField items={store.IssueStatuses()} selectedValue={this.state.selectedStatus} onValueChanged={this._issueStatusChanged}/></div>
				<ProjectList style={{float: 'left', 'width': 500, 'paddingTop' : 8}} rowHeight={ROW_HEIGHT - 3} projects={store.Projects()} issues={store.Issues} issueStatuses={store.IssueStatuses()} trackers={store.Trackers()} updateIssueWindowState={uiAction.updateIssueWindowState} deleteIssue={networkAction.deleteIssue} toggleProject={this._toggleProject}/>
				<GanttChart height={ROW_HEIGHT} width={this.state.chartDateWidth} type={this.state.chartType} projects={store.Projects()} issues={store.Issues} users={store.Users} updateIssueDate={uiAction.updateIssueDate} updateEnd={networkAction.updateIssue} style={{overflow: 'scroll', 'paddingTop' : 30}}/>
				<AddIssueWindow isOpen={this.state.isIssuwWindowOpen} type={this.state.modalType} relatedObj={this.state.modalObject} onClosed={this._issueWindowClosed}/>
				<UpdateDialog isOpen={this.state.isUpdateDialogOpen}/>
			</div>
		);
	},
	_onchartTypeChanged : function(event, index, value)
	{
		var width = ROW_HEIGHT;
		if (value == 'Week')
		{
			width = 10;
		}

		this.setState({chartType : value, chartDateWidth : width});
	},
	_onProjectsChanged : function()
	{
		store.Projects().some(function(project){
			networkAction.loadUsers(project.id);
			networkAction.loadIssues(project.id);
		});
		this._onDataChanged();
	},
	_onDataChanged : function()
	{
		this.forceUpdate();
	},
	_trackerChanged : function(event, index, value)
	{
		this.setState({ selectedTracker : value });
		uiAction.updateSelectedTracker(value);
	},
	_issueStatusChanged : function(event, index, value)
	{
		this.setState({ selectedStatus : value });
		uiAction.updateSelectedStatus(value);
	},
	_onLoadStatusChanged : function()
	{
		this.setState({isUpdateDialogOpen : store.LoadStatus()});
	},
	_onIssueWindowStateChanged : function()
	{
		var state = store.issueWindowState();
		this.setState({ isIssuwWindowOpen : state.isOpen, modalType : state.modalType, modalObject : state.modalObject });
	},
	_issueWindowClosed : function()
	{
		this.setState({ isIssuwWindowOpen : false });
	},
	_toggleProject : function(projectId)
	{
		uiAction.toggelProject(projectId);
	}
});

reactDOM.render(<Main />, document.getElementById('content'));
