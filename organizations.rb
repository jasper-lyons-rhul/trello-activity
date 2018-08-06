require 'viewer'

class Organizations < Viewer::View
  configure do |config|
    config.template = 'organizations'
  end
end
