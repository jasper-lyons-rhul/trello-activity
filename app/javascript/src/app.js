import { h } from 'src/dom.js';

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

var hiddenMemberUsernames = ['carlosmatos7', 'dave_w1', 'jasper803', 'duncanmitchell', 'matthew54106460'];

var state = {
  oauth_token: null,
  oauth_token_secret: null,
  from: '',
  to: '',
  history: [],
};

window.onpopstate = function () {
  actions.historyBack();
};

var State = {
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
  isCurrentOrganization: function (state, organization) {
    return state.currentOrganization.id === organization.id;
  },
  getActionType: function (action) {
    if (organizationalTypes.indexOf(action.type) > -1) {
      return 'organizational';
    } else if (communicatingWorkTypes.indexOf(action.type) > -1) {
      return 'communicating';
    } else {
      return 'other';
    }
  }
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
  historyBack: function () {
    return function (state) {
      if (state.history.length > 0) {
        var oldState = state.history.pop();
        return {
          currentMember: oldState.curentMember,
          currentBoard: oldState.currentBoard,
          currentOrganization: oldState.currentOrganization
        };
      }
    }
  },
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
    return { organization: null, currentBoard: { members: null } };
  },
  setActionsFor: function (member, actions) {
    member.actions = actions;
    return {};
  },
  fetchActions: function (board, member) {
    return function (state) {
      requests.fetch(String.format('/api/members/{id}/actions?idModels={idModels}&filters={filters}&limit={limit}&oauth_token={oauth_token}&oauth_token_secret={oauth_token_secret}', {
        id: member.id,
        idModels: board.id,
        filters: organizationalTypes.concat(communicatingWorkTypes, other).join(','),
        limit: 1000,
        oauth_token: state.oauth_token,
        oauth_token_secret: state.oauth_token_secret
      }))
        .then(function (r) { return r.json(); })
        .then(actions.setActionsFor.bind(actions, member));
    };
  },
  setMembersFor: function (board, members) {
    board.members = members;
    return { };
  },
  fetchMembers: function (organization, board) {
    return function (state) {
      requests.fetch(String.format('/api/organization/{id}/members?idModels={idModels}&oauth_token={oauth_token}&oauth_token_secret={oauth_token_secret}', {
        idModels: board.id,
        id: organization.id,
        oauth_token: state.oauth_token,
        oauth_token_secret: state.oauth_token_secret
      }))
        .then(function(r) { return r.json(); })
        .then(function (members) {
          actions.setMembersFor(board, members);
          members.map(actions.fetchActions.bind(actions, board));
        });
    }
  },
  setBoardsFor: function (organization, boards) {
    organization.boards = boards;
    return { };
  },
  fetchBoards: function (organization) {
    return function (state) {
      requests.fetch(String.format('/api/organizations/{id}/boards?oauth_token={oauth_token}&oauth_token_secret={oauth_token_secret}', {
        id: organization.id,
        oauth_token: state.oauth_token,
        oauth_token_secret: state.oauth_token_secret
      }))
        .then(function(r) { return r.json(); })
        .then(function (boards) {
          actions.setBoardsFor(organization, boards);
          boards.map(actions.fetchMembers.bind(actions, organization));
        });
    };
  },
  setCurrentOrganization: function (organization) {
    return function (state) {
      history.pushState(state.history.length, null, window.location.toString());
      return {
        currentMember: null,
        currentBoard: null,
        currentOrganization: organization,
        history: state.history.concat({
          currentBoard: state.currentBoard,
          currentMember: state.currentMember,
          currentOrganization: state.currentOrganization
        })
      };
    }
  },
  setOrganizations: function (organizations) {
    return { organizations: organizations };
  },
  fetchOrganizations: function () {
    return function (state) {
      requests.fetch(String.format('/api/organizations?oauth_token={oauth_token}&oauth_token_secret={oauth_token_secret}', state))
        .then(function (r) { return r.json() })
        .then(actions.setOrganizations);
    }
  },
  setCurrentMember: function (board, member) {
    return function (state) {
      history.pushState(state.history.length, null, window.location.toString());
      return {
        currentBoard: board,
        currentMember: member,
        history: state.history.concat({
          currentBoard: state.currentBoard,
          currentMember: state.currentMember,
          currentOrganization: state.currentOrganization
        })
      };
    }
  }
};

var views = {
  action: function (action) {
    return views.actions[action.type](action);
  },  
  actions: {
    base: function (header, body) {
      return h('div', { className: 'p-1' }, 
        h('div', { className: 'border-2 border-black rounded' }, [
          h('div', { className: 'p-2 border-b border-black' }, header),
          h('div', { className: 'p-2' }, body)
        ]));
    },
    header: function (action) {
      var href = String
        .format('https://trello.com/c/{shortLink}#action-{id}', {
          shortLink: action.data.shortLink,
          id: action.id
        });

      return h('a', { className: '', href: href }, action.data.card.name);
    },
    addAttachmentToCard: function(action) {
      var url = action.data.attachment.url;

      return views.actions.base(
        views.actions.header(action),
        url !== undefined
        ? (url.match(/\.(png|jpg|svg)$/)
          ? h('img', { className: 'w-full', src: url })
          : h('a', { target: '_blank', href: url }, url))
        : ''
      );
    },
    addChecklistToCard: function() {},
    addLabelToCard: function() {},
    convertToCardFromCheckItem: function() {},
    createLabel: function() {},
    createBoard: function() {},
    createCard: function() {},
    createChecklist: function() {},
    createList: function() {},
    createOrganization: function() {},
    deleteAttachmentFromCard: function() {},
    deleteCard: function() {},
    deleteCheckItem: function() {},
    deleteLabel: function() {},
    moveCardFromBoard: function() {},
    moveCardToBoard: function() {},
    moveListFromBoard: function() {},
    moveListToBoard: function() {},
    removeChecklistFromCard: function() {},
    removeFromOrganizationBoard: function() {},
    removeLabelFromCard: function() {},
    updateBoard: function() {},
    updateLabel: function() {},
    copyBoard: function() {},
    copyCard: function() {},
    copyChecklist: function() {},
    copyCommentCard: function() {},
    voteOnCard: function() {},
    updateChecklist: function() {},
    commentCard: function(action) {
      return views.actions.base(
        views.actions.header(action),
        action.data.text
      );
    },
    updateCheckItemStateOnCard: function(action) {
      return views.actions.base(
        views.actions.header(action),
        [
          'Marked ',
          h('span', { className: 'font-bold' }, action.data.checkItem.name),
          ' ',
          h('span', { className: '' }, action.data.checkItem.state)
        ]
      );
    },
    /* Custom Action Viewers */
    moveCard: function (action) {
      return views.actions.base(
        views.actions.header(action),
        [
          ' from ',
          h('span', { className: 'font-bold' }, action.data.listBefore.name),
          ' to ',
          h('span', { className: 'font-bold' }, action.data.listAfter.name)
        ]);
    },
    dueDateComplete: function (action) {
      return views.actions.base(
        views.actions.header(action),
        [
          'Marked ',
          h('span', { className: 'font-bold' },
            action.data.card.dueComplete ? 'Complete' : 'Incomplete'),
        ]);
    },
    /* Custom Action Viewers */
    updateCard: function(action) {
      if (action.data.listBefore)
        return views.actions.moveCard(action);
      if (action.data.old.hasOwnProperty('dueComplete'))
        return views.actions.dueDateComplete(action);
    },
    updateCheckItem: function() {},
    updateList: function() {},
  },
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
  currentMember: function (state, actions) {
    var comments = state.currentMember.actions.filter(function (action) {
      return ['commentCard'].indexOf(action.type) > -1;
    }).map(views.action);

    var attachments = state.currentMember.actions.filter(function (action) {
      return action.type === 'addAttachmentToCard';
    }).map(views.action);

    var cards = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCard' && action.data.listBefore;
    }).map(views.action);

    var dueDates = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCard'
        && action.data.old.hasOwnProperty('dueComplete');
    }).map(views.action);

    var checkboxes = state.currentMember.actions.filter(function (action) {
      return action.type === 'updateCheckItemStateOnCard';
    }).map(views.action);

    return h('div', { className: 'flex flex-row' }, [
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Comments')]
          .concat(comments)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Attachments')]
          .concat(attachments)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Cards')]
          .concat(cards)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Due Dates')]
          .concat(dueDates)),
      h('div', { className: 'p-1' },
        [h('h2', {}, 'Checkboxes')]
          .concat(checkboxes))
    ]);
  },
  boards: function (state, actions, organization) {
    var members = (organization.boards[0].members || [])
      .filter(function (member) {
        return hiddenMemberUsernames.indexOf(member.username) < 0;
      });

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
            var allActions = (member.actions || []).length;
            var usefulActions = (member.actions || [])
              .filter(function (action) {
                 return other.indexOf(action.type) < 0;
              }).length;

            return h('button', {
              className: 'p-2 border border-black rounded hover:bg-black hover:text-white',
              onclick: function () {
                actions.setCurrentMember(board, member);
              }
            }, String.format('{all} ({useful})', {
              all: allActions,
              useful: usefulActions
            }));
          }));
      }));
    return views.table(membersByBoards);
  },
  currentOrganization: function (state, actions, organization) {
    if (!organization || !organization.boards) {
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
      views.wrapper('p-2 border-black border-2 rounded ' + (State.isCurrentOrganization(state, organization)
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
  status: function (message) {
    return views.wrapper('h-48 w-64 flex flex-col justify-center text-center border-black border-2 rounded',
      h("h2", {}, message));
  },
  trelloActivity: function (state, actions) {
    if (!state.oauth_token || !state.oauth_token_secret)
      return h('div');

    if (!state.organizations) {
      actions.fetchOrganizations();
      return views.wrapper('flex flex-col justify-center items-center h-full',
        views.status('Loading'));
    }

    return views.organizations(state, actions);
  }
}

window.state = state;
window.actions = actions;

export { actions, views, state };
