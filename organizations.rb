require './application.rb'
require './organization_graph.rb'

class Organizations < Application
  configure do |config|
    config.template = 'organizations'
  end

  def initialize(organizations = [])
    super()
    @organizations = organizations
  end

  expose :organizations do
    @organizations
  end

  def graph_for(organization)
    OrganizationGraph.new(organization)
  end
end
