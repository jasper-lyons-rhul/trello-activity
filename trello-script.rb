require 'time'
require './lib/trello.rb'

end_time = Time.parse('2018-03-09T09:00:00Z')
start_time = (end_time - (60 * 60 * 24 * 14))

http = Http.new({}, {
  token: "588495dc8a3e976d8fc9aaa52fb9a9cdc0d64ebd766c9d65e7ec2b160669be0d",
  key: "e1a1b409f17a0c5ff1228292009108b7"
})

data = Trello::Member.new(http, 'id' => 'me').organizations.flat_map do |o|
  members = o.members
  boards = o.boards

  boards.flat_map do |b|
    members.map do |m|
      actions = m.actions({
        idModels: b.id,
        filter: 'addAttachmentToCard,addChecklistToCard,addMemberToCard,commentCard,copyCommentCard,convertToCardFromCheckItem,createCard,copyCard,deleteAttachmentFromCard,emailCard,moveCardFromBoard,moveCardToBoard,removeChecklistFromCard,removeMemberFromCard,updateCard:idList,updateCard:closed,updateCard:due,updateCard:dueComplete,updateCheckItemStateOnCard,addMemberToBoard,addToOrganizationBoard,copyBoard,createBoard,createList,deleteCard,disablePlugin,disablePowerUp,enablePlugin,enablePowerUp,makeAdminOfBoard,makeNormalMemberOfBoard,makeObserverOfBoard,moveListFromBoard,moveListToBoard,removeFromOrganizationBoard,unconfirmedBoardInvitation,unconfirmedOrganizationInvitation,updateBoard,updateList:closed,updateMember',
      }).
      # trello before / since doesn't work well
      select do |a|
        start_time <= a.date && a.date <= end_time 
      end

      {
        group: o.display_name,
        user: m.full_name,
        board: b.name,
        total_actions: actions.count,
      }.merge(
        actions.
        group_by { |a| a.type }.
        map { |type, actions| [type, actions.count] }.
        to_h
      )
    end
  end
end

columns = data.flat_map { |d| d.keys }.uniq
puts columns.join(',')
puts data.map { |d| columns.map { |c| d[c] }.join(',') }.join("\n")
