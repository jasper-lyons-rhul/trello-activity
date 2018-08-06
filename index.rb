require 'viewer'

class Index < Viewer::View
  configure do |config|
    config.template = 'index'
  end
end
