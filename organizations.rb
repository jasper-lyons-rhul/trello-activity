require 'viewer'

class Organizations < Viewer::View
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
end
