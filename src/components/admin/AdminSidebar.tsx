import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClassConfig } from "@/types";
import { cn } from "@/lib/utils";
import { 
  Plus,
  BookOpen
} from "lucide-react";

interface AdminSidebarProps {
  classes: ClassConfig[];
  currentClass: ClassConfig | null;
  onSelectClass: (classId: string) => void;
  onCreateClass: () => void;
  isCollapsed?: boolean;
}

const AdminSidebar = ({ 
  classes, 
  currentClass, 
  onSelectClass, 
  onCreateClass,
  isCollapsed = false 
}: AdminSidebarProps) => {
  return (
    <div className={cn(
      "fixed left-0 top-16 h-[calc(100vh-64px)] bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-40",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <h2 className="text-lg font-heading font-semibold text-gray-900">
                Classes
              </h2>
            )}
            <Button
              onClick={onCreateClass}
              size={isCollapsed ? "icon" : "sm"}
              className="bg-academy-blue hover:bg-academy-blue/90"
            >
              <Plus className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">New Class</span>}
            </Button>
          </div>
        </div>

        {/* Classes List */}
        <ScrollArea className="flex-1 p-3">
          <div className="space-y-1">
            {classes.length === 0 ? (
              <div className={cn(
                "text-center py-8",
                isCollapsed && "px-2"
              )}>
                {!isCollapsed ? (
                  <>
                    <BookOpen className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 mb-3">No classes yet</p>
                    <Button 
                      onClick={onCreateClass}
                      size="sm"
                      variant="outline"
                    >
                      Create First Class
                    </Button>
                  </>
                ) : (
                  <BookOpen className="w-6 h-6 mx-auto text-gray-400" />
                )}
              </div>
            ) : (
              classes.map((classItem) => (
                <button
                  key={classItem.id}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md transition-all duration-200 hover:bg-gray-100",
                    currentClass?.id === classItem.id 
                      ? "bg-academy-blue text-white hover:bg-academy-blue/90" 
                      : "text-gray-700 hover:text-gray-900",
                    isCollapsed && "px-2 py-3"
                  )}
                  onClick={() => onSelectClass(classItem.id)}
                >
                  {isCollapsed ? (
                    <div className="flex items-center justify-center">
                      <span className="text-sm font-semibold">
                        {classItem.className.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">
                        {classItem.className}
                      </span>
                      {classItem.bidders.length > 0 && (
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full",
                          currentClass?.id === classItem.id
                            ? "bg-white/20 text-white"
                            : "bg-academy-blue text-white"
                        )}>
                          {classItem.bidders.length}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        {!isCollapsed && classes.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 text-center">
              {classes.length} {classes.length === 1 ? 'class' : 'classes'} total
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSidebar;