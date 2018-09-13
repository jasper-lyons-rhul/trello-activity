require './application.rb'

class Organization < Application
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
