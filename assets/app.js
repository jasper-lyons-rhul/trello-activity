String.format = String.format || function (string, obj) {
  return Object.keys(obj).reduce(function (string, key) {
    return string.replace('{'+key+'}', obj[key]);
  }, string);
};

// helper method to get prop from map
// return value of key unless it doesn't exist in which case return the obj
function get(key) {
  return function (obj) {
    if (!obj) return obj;
    if (obj && !obj.hasOwnProperty(key)) return obj;
    return obj[key];
  };
}

var organizationalTypes = [
  'addAttachmentToCard', 'addChecklistToCard', 'addLabelToCard', 'convertToCardFromCheckItem', 'createLabel', 'createBoard', 'createCard', 'createChecklist', 'createList', 'createOrganization', 'deleteAttachmentFromCard', 'deleteCard', 'deleteCheckItem', 'deleteLabel', 'moveCardFromBoard', 'moveCardToBoard', 'moveListFromBoard', 'moveListToBoard', 'removeChecklistFromCard', 'removeFromOrganizationBoard', 'removeLabelFromCard', 'updateBoard', 'updateLabel', 'copyBoard', 'copyCard', 'copyChecklist', 'copyCommentCard', 'voteOnCard', 'updateChecklist'
];
var communicatingWorkTypes = [
  'commentCard', 'updateCheckItemStateOnCard', 'updateCard', 'updateCheckItem', 'updateList'
];
var other = [
  'addAdminToBoard', 'addAdminToOrganization', 'addBoardsPinnedToMember', 'addMemberToBoard', 'addMemberToCard', 'addMemberToOrganization', 'addToOrganizationBoard', 'createBoardInvitation', 'createBoardPreference', 'createOrganizationInvitation', 'deleteBoardInvitation', 'deleteOrganizationInvitation', 'disablePlugin', 'disablePowerUp', 'emailCard', 'enablePlugin', 'enablePowerUp', 'makeAdminOfBoard', 'makeAdminOfOrganization', 'makeNormalMemberOfBoard', 'makeNormalMemberOfOrganization', 'makeObserverOfBoard', 'memberJoinedTrello', 'removeAdminFromBoard', 'removeAdminFromOrganization', 'removeBoardsPinnedFromMember', 'removeMemberFromBoard', 'removeMemberFromCard', 'removeMemberFromOrganization', 'unconfirmedBoardInvitation', 'unconfirmedOrganizationInvitation', 'updateMember', 'updateOrganization'
];

var state = {
  key: 'e1a1b409f17a0c5ff1228292009108b7',
  token: '588495dc8a3e976d8fc9aaa52fb9a9cdc0d64ebd766c9d65e7ec2b160669be0d',
  from: '',
  to: '',
  error: '',
  hasCurrentBoard: function (organization) {
    var self = this;

    return this.currentBoard && organization
      .boards.filter(function (board) {
        return board.id === self.currentBoard.id;
      }).length > 0;
  },
  isCurrentBoard: function (board) {
    return this.currentBoard && this.currentBoard.id === board.id;
  },
  isCurrentOrganization: function (organization) {
    return this.currentOrganization.id === organization.id;
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
};

var requests = {
  queue: {},
  fetch: function (url) {
    var self = this;

    return self.queue[url]
      ? {
          then: function () { return this; },
          catch: function () { return this;}
        }
      : self.queue[url] = (function () {
          return fetch(url)
            .then(function (res) { delete self.queue[url]; return res });
        })();
  }
};

var actions = {
  setKeyAndToken: function (keyAndToken) {
    return keyAndToken;
  },
  setFromDate: function (from) {
    return { from: from };
  },
  setToDate: function (to) {
    return { to: to };
  },
  refresh: function () {
    return { organizations: null, currentBoard: { members: null } };
  },
  setActionsFor: function (member, actions) {
    member.actions = actions;
    return {};
  },
  fetchActions: function (board, member) {
    return function (state) {
      requests.fetch(String.format('/api/members/{id}/actions?idModels={idModels}&filters={filters}&limit={limit}&key={key}&token={token}', {
        id: member.id,
        idModels: board.id,
        filters: organizationalTypes.concat(communicatingWorkTypes, other).join(','),
        limit: 1000,
        key: state.key,
        token: state.token
      }))
        .then(function (r) { return r.json(); })
        .then(actions.setActionsFor.bind(actions, member))
        .catch(actions.setError);
    };
  },
  setMembersFor: function (board, members) {
    board.members = members;
    return {};
  },
  fetchMembers: function (organization, board) {
    return function (state) {
      requests.fetch(String.format('/api/organization/{id}/members?idModels={idModels}&key={key}&token={token}', {
        idModels: board.id,
        id: organization.id,
        key: state.key,
        token: state.token
      }))
        .then(function(r) { return r.json(); })
        .then(function (members) {
          actions.setMembersFor(board, members);
          members.map(actions.fetchActions.bind(actions, board));
        })
        .catch(actions.setError);
    }
  },
  setBoardsFor: function (organization, boards) {
    organization.boards = boards;
    return {};
  },
  fetchBoards: function (organization) {
    return function (state) {
      requests.fetch(String.format('/api/organizations/{id}/boards?key={key}&token={token}', {
        id: organization.id,
        key: state.key,
        token: state.token
      }))
        .then(function(r) { return r.json(); })
        .then(function (boards) {
          actions.setBoardsFor(organization, boards);
          boards.map(actions.fetchMembers.bind(actions, organization));
        })
        .catch(actions.setError)
    };
  },
  setCurrentOrganization: function (organization) {
    return {
      currentMember: null,
      currentBoard: null,
      currentOrganization: organization
    };
  },
  setOrganizations: function (organizations) {
    return { organizations: organizations };
  },
  setError: function (error) {
    return { error: error };
  },
  fetchOrganizations: function () {
    return function (state) {
      requests.fetch(String.format('/api/organizations?key={key}&token={token}', state))
        .then(function (r) { return r.json() })
        .then(actions.setOrganizations)
        .catch(actions.setError);
    }
  },
  setCurrentMember: function (board, member) {
    return {
      currentBoard: board,
      currentMember: member
    };
  }
};

var views = {
  wrapper: function (classes, children) {
    return h("div",{
      className: classes,
    }, children);
  },
  table: function (data) {
    return h('table', { className: ' ' },
      h('tbody' , { },
        data.map(function (row) {
          return h('tr', { className: '' },
            row.map(function (element) {
              return h('td', { className: 'p-2 text-center' }, element);
            }))
        })));
  },
  comment: function (state, actions, comment) {
    return h('div', { className: 'p-1' }, 
      h('div', { className: 'border-2 border-black rounded' }, [
        h('div', { className: 'p-2 border-b border-black' }, [
          h('a', {
            className: '',
            href: 'https://trello.com/c/' + comment.data.card.shortLink + '#action-' + comment.id
          }, comment.data.card.name),
        ]),
        h('div', { className: 'p-2' }, comment.data.text)
      ]));
  },
  attachment: function (state, actions, attachment) {
    return h('div', { className: 'p-1' }, 
      h('div', { className: 'p-2 border-2 border-black rounded' }, [
        h('div', { className: '' }, [
          h('a', {
            className: '',
            href: 'https://trello.com/c/' + attachment.data.card.shortLink + '#action-' + attachment.id
          }, attachment.data.card.name),
        ]),
        h('img', { className: 'w-full', src: attachment.data.attachment.previewUrl })
      ]));
  },
  movedCard: function (state, actions, action) {
    return h('div', { className: 'p-1' }, 
      h('div', { className: 'p-2 border-2 border-black rounded' }, [
        h('div', { className: '' }, [
          h('a', {
            className: '',
            href: 'https://trello.com/c/' + action.data.card.shortLink + '#action-' + action.id
          }, action.data.card.name),
          ' from ',
          h('span', { className: 'font-bold' }, action.data.listBefore.name),
          ' to ',
          h('span', { className: 'font-bold' }, action.data.listAfter.name)
        ])
      ]));
  },
  dueDate: function (state, actions, action) {
    return h('div', { className: 'p-1' }, 
      h('div', { className: 'p-2 border-2 border-black rounded' }, [
        h('div', { className: '' }, [
          h('a', {
            className: '',
            href: 'https://trello.com/c/' + action.data.card.shortLink + '#action-' + action.id
          }, action.data.card.name)
        ]),
        'Marked ',
        h('span', { className: 'font-bold' },
          action.data.card.dueComplete ? 'Complete' : 'Incomplete'),
      ]));
  },
  checkbox: function (state, actions, action) {
    return h('div', { className: 'p-1' }, 
      h('div', { className: 'p-2 border-2 border-black rounded' }, [
        h('div', { className: '' }, [
          h('a', {
            className: '',
            href: 'https://trello.com/c/' + action.data.card.shortLink + '#action-' + action.id
          }, action.data.card.name)
        ]),
        'Marked ',
        h('span', { className: 'font-bold' }, action.data.checkItem.name),
        ' ',
        h('span', { className: '' }, action.data.checkItem.state)
      ]));
  },
  currentMember: function (state, actions) {
    var comments = state.currentMember.actions.filter(function (action) {
      return action.type === 'commentCard';
    }).map(views.comment.bind(views, state, actions));

    var attachments = state.currentMember.actions.filter(function (action) {
      return action.type === 'addAttachmentToCard';
    }).map(views.attachment.bind(views, state, actions));

    var movedCards = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCard' && action.data.listBefore;
    }).map(views.movedCard.bind(views, state, actions));

    var dueDates = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCard'
        && action.data.old.hasOwnProperty('dueComplete');
    }).map(views.dueDate.bind(views, state, actions));

    var checkboxes = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCheckItemStateOnCard';
    }).map(views.checkbox.bind(views, state, actions));

    return h('div', { className: 'flex flex-row' }, [
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Comments')]
          .concat(comments)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Attachments')]
          .concat(attachments)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Moved Cards')]
          .concat(movedCards)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Due Dates')]
          .concat(dueDates)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Checkboxes')]
          .concat(checkboxes))
    ]);
  },
  boards: function (state, actions, organization) {
    var members = organization.boards[0].members;
    var memberIds = members.map(get('id'));
    var memberNames = members.map(get('fullName'));

    var membersByBoards = [[' '].concat(memberNames)].concat(
      organization.boards.map(function (board) {
        var boardMembers = memberIds.map(function (memberId) {
          return board.members.filter(function (boardMember) {
            return boardMember.id === memberId;
          })[0];
        });

        return [h('a', { href: board.url, target: "_blank" }, board.name)]
          .concat(boardMembers.map(function (member) {
            return h('button', {
              className: 'p-2 border border-black rounded hover:bg-black hover:text-white',
              onclick: function () {
                actions.setCurrentMember(board, member);
              }
            }, member.actions.length);
          }));
      }));
    return views.table(membersByBoards);
  },
  currentOrganization: function (state, actions, organization) {
    if (!organization.boards) {
      actions.fetchBoards(organization);
      return views.wrapper('w-64 flex flex-col justify-center items-stretch p-1',
        h("h2",'Loading'));
    }

    var view = state.currentBoard && state.currentMember
      ? views.currentMember(state, actions)
      : views.boards(state, actions, organization);
    
    return h('div', { className: 'flex flex-row'}, view);
  },
  organization: function (state, actions, organization) {
    return views.wrapper('p-1',
      views.wrapper('p-2 border-black border-2 rounded ' + (state.isCurrentOrganization(organization)
          ? 'bg-black text-white'
          : 'bg-none text-black'),
        h("span",{
          onclick: function () {
            actions.setCurrentOrganization(organization);
          }
        }, organization.displayName)));

  },
  organizations: function (state, actions) {
    if (!state.currentOrganization)
      actions.setCurrentOrganization(state.organizations[0]);

    return views.wrapper('flex flex-row', [
      h('div', { className: 'w-64 flex flex-col items-stretch p-1' }, [
        h('h1', { className: 'p-1' }, 'Organizations')
      ].concat(state.organizations.map(views.organization.bind(views, state, actions)))),
      views.wrapper('flex flex-col items-strech border-black border-l-2',
        views.currentOrganization(state, actions, state.currentOrganization))
    ]);
  },
  login: function (state, actions) {
    var key = h("input", { className: 'border-black border-b', placeholder: 'key' });
    var token = h("input", { className: 'border-black border-b', placeholder: 'token' });

    return views.wrapper('flex flex-col justify-center items-center h-full', 
      views.wrapper('h-48 w-64 flex flex-col justify-center text-center border-black border-2 rounded', [
        views.wrapper('p-2',
          h("a", {
            href: 'https://trello.com/app-key'
            }, 'Get Trello api token & key here')),
        views.wrapper('p-2', key),
        views.wrapper('p-2', token),
        views.wrapper('flex flex-row justify-center',
          h("a",{
            className: 'p-2 border-black border-2 rounded hover:bg-black hover:text-white',
            onclick: function () {
              actions.setKeyAndToken({ key: key.value, token: token.value });
            }
          }, 'View Activity')) 
        ]));
  },
  status: function (message) {
    return views.wrapper('h-48 w-64 flex flex-col justify-center text-center border-black border-2 rounded',
      h("h2",message));
  },
  trelloActivity: function (state, actions) {
    if (!state.token || !state.key)
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.login(state, actions));

    if (state.error)
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.status(state.error));

    if (!state.organizations) {
      actions.fetchOrganizations();
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.status('Loading'));
    }

    return views.organizations(state, actions);
  }
}

window.onload = function () {
  mount(state, actions, views.trelloActivity, document.body);
}
