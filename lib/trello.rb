require 'net/http'
require 'uri'
require 'openssl'
require 'json'
require 'time'

class Http
  def initialize(headers = {}, params = {}, cache = {})
    @headers = headers
    @params = params
    @cache = cache
  end

  def with_params(url, params)
    new_params = @params.
      merge(params || {}).
      map do |key, value|
      case value
      when Array
        # trello way of doing params
        "#{key}=#{value.join(',')}"
      else
        "#{key}=#{value}"
      end
    end

    "#{url}?#{new_params.join('&')}"
  end

  def request(method, url, params = nil, body = {}, retry_time = 2)
    uri = URI(with_params(url, params))

    @cache.fetch(uri.to_s) do
      http = Net::HTTP.new(uri.host, uri.port)

      if uri.scheme == 'https'
        http.use_ssl = true
        http.verify_mode = OpenSSL::SSL::VERIFY_NONE
      end

      req = case method
            when 'get', 'GET', :get
              Net::HTTP::Get.new(uri)
            else
              raise "HTTP Method #{method} not implemented"
            end

      @cache[uri.to_s] = http.request(req).tap do |res|
        case res
        when Net::HTTPSuccess
          res
        when Net::HTTPError
          puts "#{uri} - #{res.code} - #{res.body}"

          case res.code
          when 429
            sleep retry_time
            request(method, url, params, body, retry_time * retry_time)
          end
        end
      end
    end
  end

  def get(url, params = nil)
    request(:get, url, params)
  end
end


module Trello
  class Base
    def initialize(http, data, path, cache = {})
      @http = http
      @data = data
      @path = path
      @cache = cache
    end

    attr_accessor :data, :cache

    def id
      @data['id']
    end

    def ==(other)
      self.id == other.id
    end

    def load
      self.class.new(@http, nested, cache)
    end

    private

    def from_api(path)
      "https://api.trello.com/1/#{path}" 
    end

    def path(entity = nil)
      [@path, id, entity].
        compact.
        join('/')
    end

    def nested(entity = nil, params = nil)
      JSON.parse(@http.get(from_api(path(entity)), params).body)
    end
  end

  class Member < Base
    def initialize(http, data, cache = {})
      super(http, data, 'members', cache)
    end

    def organizations
      nested('organizations').map { |o| Organization.new(@http, o, cache) }
    end

    def actions(params = nil)
      nested("actions", params).map { |a| Action.new(@http, a, cache) }
    end

    def full_name
      @data['fullName']
    end
  end

  class Organization < Base
    def initialize(http, data, cache = {})
      super(http, data, 'organizations', cache)
    end

    def members(params = nil)
      nested('members', params).map { |m| Member.new(@http, m, cache) }
    end

    def boards
      nested('boards').map { |m| Board.new(@http, m, cache) }
    end

    def actions
      nested("actions").map { |a| Action.new(@http, a, cache) }
    end

    def display_name
      @data['displayName']
    end
  end

  class Board < Base
    def initialize(http, data, cache = {})
      super(http, data, 'board', cache)
    end

    def actions(params = nil)
      nested("actions", params).map { |a| Action.new(@http, a, cache) }
    end

    def name
      @data['name']
    end
  end

  class Action < Base
    def initialize(http, data, cache = {})
      super(http, data, 'actions', cache)
    end

    def type
      @data['type']
    end

    def date
      Time.parse(@data['date'])
    end

    def creator
      Member.new(@http, @data['memberCreator'], cache)
    end
  end
end
