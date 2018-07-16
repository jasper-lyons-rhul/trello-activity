require 'sinatra/base'
require 'viewer'
require './lib/trello.rb'

class Index < Viewer::View
  configure do |config|
    config.template = 'index'
    config.css.add('assets/app.css')
    config.js.add('assets/dom.js')
    config.js.add('assets/app.js')
  end
end

class TrelloActivity < Sinatra::Base
  set :public_folder, File.dirname(__FILE__)

  helpers do
    def cache
      @cache ||= {}
    end
  end

  get '/' do
    Index.new.render
  end

  get '/api/organizations' do
    http = Http.new({}, {
      key: params[:key],
      token: params[:token]
    })

    JSON.dump(Trello::Member.new(http, 'id' => 'me').organizations.map(&:data))
  end

  get '/api/organizations/:id/boards' do
    http = Http.new({}, {
      key: params[:key],
      token: params[:token]
    })

    JSON.dump(Trello::Organization.new(http, 'id' => params[:id])
      .boards.map(&:data))
  end

  get '/api/organization/:id/members' do
    http = Http.new({}, {
      key: params[:key],
      token: params[:token]
    })

    JSON.dump(Trello::Organization.new(http, 'id' => params[:id])
      .members({ idModels: params[:idModels] }).map(&:data))
  end

  get '/api/members/:id/actions' do
    http = Http.new({}, {
      key: params[:key],
      token: params[:token]
    })

    JSON.dump(Trello::Member.new(http, 'id' => params[:id])
      .actions({
        idModels: params[:idModels],
        filters: params[:filters],
        limit: params[:limit]
      }).map(&:data))
  end
end


run TrelloActivity
