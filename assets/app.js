var data = persistent('trello-activity', {
  key: '',
  token: '',
  from: '',
  to: ''
});

var remoteStatus = {};
var organizationalTypes = [
'addAttachmentToCard', 'addChecklistToCard', 'addLabelToCard', 'convertToCardFromCheckItem', 'createLabel', 'createBoard', 'createCard', 'createChecklist', 'createList', 'createOrganization', 'deleteAttachmentFromCard', 'deleteCard', 'deleteCheckItem', 'deleteLabel', 'moveCardFromBoard', 'moveCardToBoard', 'moveListFromBoard', 'moveListToBoard', 'removeChecklistFromCard', 'removeFromOrganizationBoard', 'removeLabelFromCard', 'updateBoard', 'updateLabel'
];
var communicatingWorkTypes = [
'commentCard', 'updateCheckItemStateOnCard', 'updateChecklist', 'updateCard', 'updateCheckItem', 'updateList'
];
var other = [
'addAdminToBoard', 'addAdminToOrganization', 'addBoardsPinnedToMember', 'addMemberToBoard', 'addMemberToCard', 'addMemberToOrganization', 'addToOrganizationBoard', 'copyBoard', 'copyCard', 'copyChecklist', 'copyCommentCard', 'createBoardInvitation', 'createBoardPreference', 'createOrganizationInvitation', 'deleteBoardInvitation', 'deleteOrganizationInvitation', 'disablePlugin', 'disablePowerUp', 'emailCard', 'enablePlugin', 'enablePowerUp', 'makeAdminOfBoard', 'makeAdminOfOrganization', 'makeNormalMemberOfBoard', 'makeNormalMemberOfOrganization', 'makeObserverOfBoard', 'memberJoinedTrello', 'removeAdminFromBoard', 'removeAdminFromOrganization', 'removeBoardsPinnedFromMember', 'removeMemberFromBoard', 'removeMemberFromCard', 'removeMemberFromOrganization', 'unconfirmedBoardInvitation', 'unconfirmedOrganizationInvitation', 'updateMember', 'updateOrganization', 'voteOnCard', 
];

var app = {
  setKey: function (key) {
    data.key = key;
  },
  setToken: function (token) {
    data.token = token;
  },
  setFromDate: function (from) {
    data.from = from;
    render();
  },
  setToDate: function (to) {
    data.to = to;
    render();
  },
  refresh: function () {
    delete data.organizations;
    delete data.currentBoard.members;
    render();
  },
  getActionType: function (action) {
    if (organizationalTypes.indexOf(action.type) > -1) {
      return 'organizational';
    } else if (communicatingWorkTypes.indexOf(action.type) > -1) {
      return 'communicating';
    } else {
      return 'other';
    }
  },
  fetchActions: function (board, member) {
    if (!remoteStatus.actions) {
      remoteStatus.actions = true
      fetch(String.format('/api/members/{id}/actions?idModels={idModels}&filters={filters}&limit={limit}&key={key}&token={token}', {
        id: member.id,
        idModels: board.id,
        filters: organizationalTypes.concat(communicatingWorkTypes, other).join(','),
        limit: 1000,
        key: data.key,
        token: data.token
      })).then(function (r) { return r.json(); })
        .then(function (actions) {
          member.actions = actions;
          remoteStatus.actions = false;
          render();
        }).catch(function (err) {
          remoteStatus.error = err
          render();
        });
    }
  },
  fetchMembers: function (organization, board) {
    if (!remoteStatus.members) {
      remoteStatus.members = true;
      fetch(String.format('/api/organization/{id}/members?idModels={idModels}&key={key}&token={token}', {
        idModels: board.id,
        id: organization.id,
        key: data.key,
        token: data.token
      })).then(function(r) { return r.json(); })
        .then(function (members) {
          board.members = members;
          remoteStatus.members = false;
          render();
        }).catch(function (err) {
          remoteStatus.error = err
          render();
        });
    }
  },
  hasCurrentBoard: function (organization) {
    return organization.boards.filter(function (board) {
      return board.id === data.currentBoard.id;
    }).length > 0;
  },
  isCurrentBoard: function (board) {
    return data.currentBoard.id === board.id;
  },
  setCurrentBoard: function (board) {
    data.currentBoard = board;
    render();
  },
  fetchBoards: function (organization) {
    if (!remoteStatus.boards) {
      remoteStatus.boards= true;
      fetch(String.format('/api/organizations/{id}/boards?key={key}&token={token}', {
        id: organization.id,
        key: data.key,
        token: data.token
      })).then(function(r) { return r.json(); })
        .then(function (boards) {
          organization.boards = boards;
          remoteStatus.boards = false;
          render();
        }).catch(function (err) {
          remoteStatus.error = err
          render();
        });
    }
  },
  isCurrentOrganization: function (organization) {
    return data.currentOrganization.id === organization.id;
  },
  setCurrentOrganization: function (organization) {
    data.currentOrganization = organization;
    render();
  },
  fetchOrganizations: function () {
    if (!remoteStatus.organizations) {
      remoteStatus.organizations = true;
      fetch(String.format('/api/organizations?key={key}&token={token}', data))
        .then(function (r) { return r.json() })
        .then(function (organizations) {
          data.organizations = organizations;
          remoteStatus.organizations = false;
          render();
        }).catch(function (err) {
          remoteStatus.error = err
          render();
        });
    }
  }
};

var views = {
  wrapper: function (classes, children) {
    if (!children.hasOwnProperty('length'))
      children = [children];

    return html.div({
      className: classes,
      children: children
    });
  },
  member: function (board, member) {
    var cell = Function.compose(
      html.span,
      views.wrapper.bind(views, 'p-2'),
      views.wrapper.bind(views, 'p-1 w-48')
    );

    if (!member.actions) {
      app.fetchActions(board, member);

      return views.wrapper('flex flex-row', [
        views.wrapper('p-1 flex-grow',
          views.wrapper('p-2',
            html.span(member.fullName))),
        cell('...'),
        cell('...'),
        cell('...')
      ])
    }

    var actionTypes = member.actions
      .filter(function (action) {
        if (data.from !== '')
          return Date.parse(data.from) <= Date.parse(action.date)
        return true;
      })
      .filter(function (action) {
        if (data.to!== '')
          return Date.parse(data.to) >= Date.parse(action.date)
        return true;
      })
      .reduce(function(actionTypes, action) {
        var actions = actionTypes[app.getActionType(action)] || [];
        actions.push(action);
        actionTypes[app.getActionType(action)] = actions;
        return actionTypes;
      }, {});

    return views.wrapper('flex flex-row', [
      views.wrapper('p-1 flex-grow',
        views.wrapper('p-2',
          html.span(member.fullName))),
    ].concat(['organizational', 'communicating', 'other'].map(function (actionType) {
      return cell((actionTypes[actionType] || []).length.toString());
    })));
  },
  members: function (data, board) {
    var refresh = html.a({
      className: 'p-2 border-black border-2 rounded hover:bg-black hover:text-white',
      text: 'Refresh',
      onclick: app.refresh
    });

    var from = html.input({
      className: 'p-2 border-black border-b-2',
      type: 'date',
      value: data.from,
      placeholder: 'From date',
      onchange: function () {
        app.setFromDate(this.value);
      }
    });

    var to = html.input({
      className: 'p-2 border-black border-b-2',
      type: 'date',
      value: data.to,
      placeholder: 'To date',
      onchange: function () {
        app.setToDate(this.value);
      }
    });

    var actions = views.wrapper('p-1 flex flex-row items-center', [
      refresh,
      html.label({ text: 'From date:', children: [from] }),
      html.label({ text: 'To date:', children: [to] })
    ].map(views.wrapper.bind(views, 'p-1')));

    var columnHeader = Function.compose(
      html.span,
      views.wrapper.bind(views, 'p-2'),
      views.wrapper.bind(views, 'p-1 w-48')
    );

    var table = views.wrapper('p-1', [ 
      views.wrapper('flex flex-row border-black border-b-2',
        ['Member', 'Organization', 'Work', 'Other'].map(columnHeader))
    ].concat(board.members.map(views.member.bind(views, board))));

    return views.wrapper('min-w-64 flex flex-col items-stretch border-black border-l-2', [
      actions,
      table
    ]);
  },
  currentBoard: function (board) {
    return html.div(board.name);
  },
  board: function (board) {
    return views.wrapper('p-1',
      views.wrapper('p-2 border-black border-2 rounded ' + (app.isCurrentBoard(board)
          ? 'bg-black text-white'
          : 'bg-none text-black'),
        html.span({
          text: board.name,
          onclick: function () {
            app.setCurrentBoard(board);
          }
        })));
  },
  boards: function (data, organization) {
    return views.wrapper('min-w-64 flex flex-col items-stretch',
      views.wrapper('p-1',
        organization.boards.map(views.board)));
  },
  currentOrganization: function (data, organization) {
    if (!organization.boards) {
      app.fetchBoards(organization);
      return views.wrapper('w-64 flex flex-col justify-center items-stretch p-1',
        html.h2('Loading'));
    }
    
    if (!data.currentBoard || !app.hasCurrentBoard(organization)) {
      app.setCurrentBoard(organization.boards[0]);
      return views.wrapper('w-64 flex flex-col justify-center items-stretch p-1',
        html.h2('Loading'));
    }
    
    if (!data.currentBoard.members) {
      app.fetchMembers(organization, data.currentBoard);
      return views.wrapper('w-64 flex flex-col justify-center items-stretch p-1',
        html.h2('Loading'));
    }

    return views.wrapper('flex flex-row', [
      views.boards(data, organization),
      views.members(data, data.currentBoard)
    ]);
  },
  organization: function (organization) {
    return views.wrapper('p-1',
      views.wrapper('p-2 border-black border-2 rounded ' + (app.isCurrentOrganization(organization)
          ? 'bg-black text-white'
          : 'bg-none text-black'),
        html.span({
          text: organization.displayName,
          onclick: function () {
            app.setCurrentOrganization(organization);
          }
        })));

  },
  organizations: function (data) {
    if (!data.currentOrganization)
      app.setCurrentOrganization(data.organizations[0]);

    return views.wrapper('flex flex-row', [
      views.wrapper('w-64 flex flex-col justify-center items-stretch p-1',
        data.organizations.map(views.organization)),
      views.wrapper('flex flex-col items-strech border-black border-l-2',
        views.currentOrganization(data, data.currentOrganization))
    ]);
  },
  login: function () {
    var key = html.input({ className: 'border-black border-b', placeholder: 'key' });
    var token = html.input({ className: 'border-black border-b', placeholder: 'token' });

    return views.wrapper('flex flex-col justify-center items-center h-full', 
      views.wrapper('h-48 w-64 flex flex-col justify-center text-center border-black border-2 rounded', [
        views.wrapper('p-2', key),
        views.wrapper('p-2', token),
        views.wrapper('flex flex-row justify-center',
          html.a({
            className: 'p-2 border-black border-2 rounded hover:bg-black hover:text-white',
            text: 'View Activity',
            onclick: function () {
              app.setKey(key.value);
              app.setToken(token.value);
              render();
            }
          }))
        ]));
  },
  status: function (message) {
    return views.wrapper('h-48 w-64 flex flex-col justify-center text-center border-black border-2 rounded',
      html.h2(message));
  },
  trelloActivity: function (data) {
    if (!data.token || !data.key)
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.login());

    if (remoteStatus.error)
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.status(remoteStatus.error.message));

    if (!data.organizations) {
      app.fetchOrganizations();
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.status('Loading'));
    }

    return views.organizations(data);
  }
}

window.onload = render = makeRenderer(document.body, data, views.trelloActivity);
