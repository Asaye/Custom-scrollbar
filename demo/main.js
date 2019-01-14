
var sBarModule = angular.module("sBarApp", []);

sBarModule.directive('hasScrollbar',['scrollbar', '$window', '$compile', '$timeout', '$interval',
                        function(scrollbar, $window, $compile, $timeout, $interval){
  return {
        restrict: 'EA',
        link: function(scope, element) {
            var replace = function() {
                var timer = $interval(function() {
                    element.prev().children().remove();
                    element.prev().remove();
                    var vertical = scrollbar.getVertical(element);
                    vertical.scroller.attr("factor", vertical.factor);
                    $compile(vertical.scrollBar)(scope);
                    if (element.height() > 0) {
                        $interval.cancel(timer);
                    }
                }, 100);
            };
            element.ready(function() {
                scope.$apply(function() {
                   $timeout(function() { 
                       var vertical = scrollbar.getVertical(element),
                           index = scope.$index;
                       vertical.scroller.attr("factor", vertical.factor);
                       vertical.scrollBar.attr("table", index);
                       $compile(vertical.scrollBar)(scope);
                   }, 100);
                });
            });
            scope.$on('pageSizeChange', function(event, data) {
                if (element.attr("table") == data.index) {
                    $timeout(function() {
                        if (data.scrollDown) {
                            var resized = scrollbar.resizeBottom(element, true);
                        } else {
                            var resized = scrollbar.resizeBottom(element);
                        }
                        var scroller = element.prev().children();
                        scroller.attr("factor", resized.factor);
                   
                    }, 100);
                }
            }); 
            scope.$on('windowResized', function(event, data) {
                if (data) {
                    if (element.attr("table") === data.index) {
                        replace();
                    }
                } else {
                    replace();
                }
            }); 
        }
    }
}]);

sBarModule.directive('dbScrollBar', ['scrollbar', function(scrollbar){
  return {
    restrict: 'EA',
    link: function(scope, element, attrs) {
            element.on('click', function(e) {
                scope.$apply(function() {
                    var y = e.originalEvent.layerY,
                        factor = scope.table.get.scroll;                    
                    scrollbar.moveTo(element, y, factor);
                });
            });
        }
    }
}]);

sBarModule.directive('scroller', [function() {
  return {
    restrict: 'EA',
    link: function(scope, element) {
            var content = null, factor, init_table, init_scroller, offset = 0; 
            $(element).draggable ({
                containment : element.parent(),
                start: function(event, ui) {                 
                    content = element.parent().next(); 
                    init_table = content.offset().top;
                    init_scroller = ui.offset.top;
                    content.offset({top: 0});
                    factor = parseFloat($(this).attr("factor"));
                },
                drag: function(event, ui) {
                    offset = (init_scroller- ui.offset.top)*factor + init_table;
                    content.offset({top: offset});
                    ui.position.left = 0;
                }
            });
        }
    }
}]);

sBarModule.factory('scrollbar',['$timeout', function($timeout) {
    return {  
        'getParams': function(element) {
            if (element.prev().length > 0) {
                var scrollBar = element.prev(),
                scroller = scrollBar.children(),
                rect = scroller[0].getBoundingClientRect(),
                top_scroller = scroller.offset().top,
                height = rect.bottom - rect.top;
            } 
            var h_view = element.parent().height(),
                h_scroll = element[0].scrollHeight,
                h_scroller = (h_view/h_scroll)*h_view,
                top = element.parent().offset().top,
                factor = (h_scroll - h_view)/(h_view - h_scroller);
                return {
                    'factor': factor,                    
                    'view': h_view,
                    'scroll': h_scroll,
                    'h_new': h_scroller,
                    'h_old': height > 0 ? height : h_scroller,
                    'scroller': scroller,
                    'scrollBar': scrollBar,
                    'top': top,
                    'init': top_scroller > 0 ? top_scroller : top,
                }
        }, 
        'getVertical': function(element) {
            var params = this.getParams(element),
                scrollBar = angular.element("<div></div>"),
                scroller = angular.element("<div></div>");
            scrollBar.addClass('scrollbar');
            scroller.addClass('scroller');
            scrollBar.css("height", params.view + "px");
            scroller.css("height", params.h_new + "px");
            scrollBar.attr("db-scroll-bar","");
            scroller.attr("scroller","");            
            scrollBar.prepend(scroller);
            element.before(scrollBar);
            element.css("top", 0);
            if (params.factor <= 1) {
                scrollBar.addClass("hidden");
            }
            return {
                'scrollBar': scrollBar,
                'scroller': scroller,
                'factor': params.factor
            };
        },
        'resizeBottom': function(element, scrollDown) {

            var params = this.getParams(element),
                scrollBar = params.scrollBar, 
                scroller = params.scroller, top_ele, top_par,
                h_init = scroller.offset().top - (params.h_new - params.h_old);
            if (params.view > 0 && params.factor > 0 && params.factor <= 1) {  
                element.offset({top: params.top});
                scrollBar.addClass("hidden");
            } else if (params.view > 0) {
                if (scrollDown) {
                    h_init = params.view - params.h_new,
                    offset =  params.top - h_init*params.factor;
                    h_init = h_init + params.top;
                    if (scrollBar[0].getBoundingClientRect().height === 0) {
                        $timeout(function() {
                            h_init = params.view - params.h_new,
                            offset =  params.top - h_init*params.factor;
                            h_init = h_init + params.top;
                            scroller.offset({top: h_init});
                            element.offset({top: offset});
                        }, 100);
                    }
                } else {
                    var h = params.init - (params.h_new - params.h_old),
                    offset =  params.top + (params.top - h)*params.factor;
                }
                scroller.offset({top: h_init});
                element.offset({top: offset});
                scrollBar.css("height", params.view + "px");
                scroller.css("height", params.h_new + "px");
                scrollBar.removeClass("hidden");    
            } 
            top_ele = element.offset();
            top_par = element.parent().offset();
            if (top_ele > top_par) {
                element.offset({top: top_par});
                scroller.offset({top: 0});
            }  
            return { 'factor': params.factor};          
        },
        'moveTo': function(element, y, factor) {
            var params = this.getParams(element.next()), h = params.h_new/2,
                scroller = params.scroller, 
                top = (y - h) < 0 ? params.top : 
                      ((y + h) > params.view ? params.top + params.view - 2*h : params.top + y - h),
                offset = params.top + params.factor*(params.top - top);
            scroller.offset({top: top});            
            element.next().offset({top: offset});
        }
    };
}]);
