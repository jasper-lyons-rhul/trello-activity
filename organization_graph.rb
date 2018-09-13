require 'viewer'

class OrganizationGraph < Viewer::View
  configure do |config|
    config.format = 'svg'
    config.template = 'organization_graph'
  end

  def initialize(organization)
    super()
    @organization = organization
  end

  expose :organization do
    @organization
  end

  def actions_at(date)
    organization.members.flat_map do |member|
      organization.boards.flat_map do |boards|
        member.
          actions(idModels: boards.id).
          select { |a| a.date.to_date == date }
      end
    end
  end
end
