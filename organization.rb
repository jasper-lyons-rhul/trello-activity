require 'viewer'

class Organization < Viewer::View
  configure do |config|
    config.template = 'organization'
  end

  def initialize(organization)
    super()
    @organization = organization
  end

  expose :organization do
    @organization
  end
end
