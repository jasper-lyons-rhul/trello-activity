require 'viewer'

class Organization < Viewer::View
  configure do |config|
    config.template = 'organization'
  end
end
